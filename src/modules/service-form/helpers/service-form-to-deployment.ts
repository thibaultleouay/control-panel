import {
  ApiArchiveSource,
  ApiBuildpackBuilder,
  ApiDeploymentDefinition,
  ApiDeploymentEnv,
  ApiDeploymentHealthCheck,
  ApiDeploymentScaling,
  ApiDeploymentScalingTarget,
  ApiDockerBuilder,
  ApiDockerSource,
  ApiGitSource,
  ApiHttpHealthCheck,
  ApiPort,
  ApiRoute,
  ApiTcpHealthCheck,
} from 'src/api/api-types';
import { EnvironmentVariable } from 'src/api/model';
import { assert } from 'src/utils/assert';
import { entries } from 'src/utils/object';

import {
  ArchiveSource,
  AutoScaling,
  Builder,
  DockerDeploymentOptions,
  DockerSource,
  GitSource,
  Port,
  Scaling,
  ServiceForm,
  ServiceVolume,
} from '../service-form.types';

export function serviceFormToDeploymentDefinition(form: ServiceForm): ApiDeploymentDefinition {
  return {
    name: form.serviceName,
    type: form.serviceType === 'web' ? 'WEB' : 'WORKER',
    archive: form.source.type === 'archive' ? archive(form.source.archive, form.builder) : undefined,
    git: form.source.type === 'git' ? git(form.source.git, form.builder) : undefined,
    docker: form.source.type === 'docker' ? docker(form.source.docker, form.dockerDeployment) : undefined,
    regions: form.regions,
    instance_types: [{ type: form.instance.identifier ?? '' }],
    scalings: scalings(form.scaling),
    env: env(form.environmentVariables),
    volumes: volumes(form.volumes),
    ...(form.serviceType === 'web' && {
      ports: ports(form.ports),
      routes: routes(form.ports),
      health_checks: healthChecks(form.ports),
    }),
  };
}

function archive(archive: ArchiveSource, builder: Builder): ApiArchiveSource {
  return {
    id: archive.archiveId,
    buildpack: builder.type === 'buildpack' ? buildpack(builder) : undefined,
    docker: builder.type === 'dockerfile' ? dockerfile(builder) : undefined,
  };
}

function git(git: GitSource, builder: Builder): ApiGitSource {
  const common: ApiGitSource = {
    workdir: git.workDirectory ?? undefined,
    buildpack: builder.type === 'buildpack' ? buildpack(builder) : undefined,
    docker: builder.type === 'dockerfile' ? dockerfile(builder) : undefined,
  };

  if (git.repositoryType === 'organization') {
    return {
      repository: `github.com/${git.organizationRepository.repositoryName ?? ''}`,
      branch: git.organizationRepository.branch ?? '',
      no_deploy_on_push: !git.organizationRepository.autoDeploy,
      ...common,
    };
  }

  return {
    repository: `github.com/${git.publicRepository.repositoryName ?? ''}`,
    branch: git.publicRepository.branch ?? '',
    ...common,
  };
}

function buildpack({ buildpackOptions }: Builder): ApiBuildpackBuilder {
  return {
    build_command: buildpackOptions.buildCommand ?? undefined,
    run_command: buildpackOptions.runCommand ?? undefined,
    privileged: buildpackOptions.privileged,
  };
}

function dockerfile({ dockerfileOptions }: Builder): ApiDockerBuilder {
  return {
    dockerfile: dockerfileOptions.dockerfile ?? undefined,
    entrypoint: dockerfileOptions.entrypoint ?? undefined,
    command: dockerfileOptions.command ?? undefined,
    args: dockerfileOptions.args ?? undefined,
    target: dockerfileOptions.target ?? undefined,
    privileged: dockerfileOptions.privileged,
  };
}

function docker(docker: DockerSource, options: DockerDeploymentOptions): ApiDockerSource {
  return {
    image: docker.image,
    command: options.command ?? undefined,
    args: options.args ?? undefined,
    image_registry_secret: docker.registrySecret ?? undefined,
    entrypoint: options.entrypoint ?? undefined,
    privileged: options.privileged ?? false,
  };
}

function scalings(scaling: Scaling): Array<ApiDeploymentScaling> {
  if (scaling.type === 'fixed') {
    return [{ min: scaling.fixed, max: scaling.fixed }];
  }

  const targets = new Array<ApiDeploymentScalingTarget>();

  const keyMap: Record<keyof AutoScaling['targets'], keyof ApiDeploymentScalingTarget> = {
    cpu: 'average_cpu',
    memory: 'average_mem',
    requests: 'requests_per_second',
    concurrentRequests: 'concurrent_requests',
    responseTime: 'requests_response_time',
  };

  entries(scaling.autoscaling.targets)
    .filter(([, { enabled }]) => enabled)
    .forEach(([target, { value }]) => targets.push({ [keyMap[target]]: { value } }));

  if (scaling.autoscaling.targets.responseTime.enabled) {
    const target = targets.find((target) => 'requests_response_time' in target);

    assert(target?.requests_response_time !== undefined);
    target.requests_response_time.quantile = 95;
  }

  return [
    {
      min: scaling.autoscaling.min,
      max: scaling.autoscaling.max,
      targets,
    },
  ];
}

function env(variables: Array<EnvironmentVariable>): Array<ApiDeploymentEnv> {
  return variables.map((variable) => {
    const env: ApiDeploymentEnv = {
      key: variable.name,
    };

    if (variable.type === 'plaintext') {
      env.value = variable.value;
    }

    if (variable.type === 'secret') {
      env.secret = variable.value;
    }

    return env;
  });
}

function ports(ports: Array<Port>): Array<ApiPort> {
  return ports.map(({ portNumber, protocol, public: isPublic }: Port) => {
    return {
      port: Number(portNumber),
      protocol: isPublic ? protocol : 'tcp',
    };
  });
}

function routes(ports: Array<Port>): Array<ApiRoute> {
  return ports
    .map((port): ApiRoute | undefined => {
      if (!port.public) {
        return;
      }

      return {
        port: Number(port.portNumber),
        path: port.path,
      };
    })
    .filter((value): value is ApiRoute => value !== undefined);
}

function healthChecks(ports: Array<Port>): Array<ApiDeploymentHealthCheck> {
  return ports.map((port): ApiDeploymentHealthCheck => {
    const portNumber = Number(port.portNumber);
    const healthCheck = port.healthCheck;

    const tcp = (): ApiTcpHealthCheck => ({
      port: portNumber,
    });

    const http = (): ApiHttpHealthCheck => ({
      port: portNumber,
      path: healthCheck.path,
      method: healthCheck.method.toUpperCase(),
      headers: healthCheck.headers.map(({ name, value }) => ({
        key: name,
        value,
      })),
    });

    return {
      grace_period: Number(healthCheck.gracePeriod),
      interval: Number(healthCheck.interval),
      restart_limit: Number(healthCheck.restartLimit),
      timeout: Number(healthCheck.timeout),
      ...(healthCheck.protocol === 'tcp' && { tcp: tcp() }),
      ...(healthCheck.protocol === 'http' && { http: http() }),
    };
  });
}

function volumes(volumes: ServiceVolume[]) {
  return volumes
    .filter((volume) => volume.volumeId !== '')
    .map((volume) => ({
      id: volume.volumeId,
      path: volume.mountPath,
    }));
}

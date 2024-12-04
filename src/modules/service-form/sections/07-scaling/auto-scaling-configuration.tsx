import { useController, useFormContext, useFormState } from 'react-hook-form';

import { InputEnd, Slider, Tooltip } from '@koyeb/design-system';
import { onKeyDownPositiveInteger } from 'src/application/restrict-keys';
import { ControlledInput, ControlledSelectBox } from 'src/components/controlled';
import {
  IconAlarmClockCheck,
  IconClock,
  IconCpu,
  IconListMinus,
  IconMoon,
  IconPanelsLeftBottom,
  IconTimer,
} from 'src/components/icons';
import { useFeatureFlag } from 'src/hooks/feature-flag';
import { Translate } from 'src/intl/translate';
import { inArray } from 'src/utils/arrays';

import { Scaling, ServiceForm } from '../../service-form.types';
import { useWatchServiceForm } from '../../use-service-form';

import { handleScalingValueBlurred } from './handle-scaling-value-blurred';

const T = Translate.prefix('serviceForm.scaling.autoscalingSettings');

export function AutoScalingConfiguration() {
  const min = useWatchServiceForm('scaling.min');
  const scaleToZeroIdleDelay = useFeatureFlag('scale-to-zero-idle-delay');

  return (
    <>
      <div className="col gap-6">
        <p>
          <T id="description" />
        </p>

        <ScalingValues />

        <p>
          <T id="enableAutoscaling" />
        </p>
      </div>

      {scaleToZeroIdleDelay && min === 0 && (
        <ScalingTarget target="sleepIdleDelay" Icon={IconClock} min={3 * 60} max={60 * 60} />
      )}

      <ScalingTarget target="requests" Icon={IconTimer} min={1} max={1e9} />
      <ScalingTarget target="cpu" Icon={IconCpu} min={1} max={100} />
      <ScalingTarget target="memory" Icon={IconPanelsLeftBottom} min={1} max={100} />
      <ScalingTarget target="concurrentRequests" Icon={IconListMinus} min={1} max={1e9} />
      <ScalingTarget target="responseTime" Icon={IconAlarmClockCheck} min={1} max={1e9} />
    </>
  );
}

function ScalingValues() {
  const { setValue } = useFormContext<ServiceForm>();

  const serviceType = useWatchServiceForm('serviceType');
  const hasVolumes = useWatchServiceForm('volumes').filter((volume) => volume.name !== '').length > 0;
  const instance = useWatchServiceForm('instance');
  const scaling = useWatchServiceForm('scaling');

  const canChangeScaling = instance !== 'free' && !hasVolumes;

  const scaleToZero = useFeatureFlag('scale-to-zero');
  const scaleToZeroWithAutoscaling = useFeatureFlag('allow-scale-to-zero-with-autoscaling');

  const setScalingValue = (field: 'min' | 'max') => {
    return (value: number) => setValue(`scaling.${field}`, value, { shouldValidate: true });
  };

  const min = scaleToZero && serviceType === 'web' ? 0 : 1;
  const max = 20;

  const { field: minField } = useController<ServiceForm, 'scaling.min'>({ name: 'scaling.min' });
  const { field: maxField } = useController<ServiceForm, 'scaling.max'>({ name: 'scaling.max' });

  return (
    <div className="row gap-8">
      <ControlledInput<ServiceForm, 'scaling.min'>
        name="scaling.min"
        type="number"
        label={<T id="min" />}
        disabled={!canChangeScaling}
        onKeyDown={onKeyDownPositiveInteger}
        min={min}
        max={max}
        step={1}
        onBlur={(event) => handleScalingValueBlurred(event, setScalingValue('min'))}
        className="w-24"
      />

      <Slider
        min={min}
        max={max}
        tickSize={2}
        renderTick={(value) => {
          if (value === 0) {
            return <IconMoon className="mt-0.5 size-4" />;
          } else {
            // eslint-disable-next-line tailwindcss/no-arbitrary-value
            return <span className="text-[0.5rem] font-medium">|</span>;
          }
        }}
        value={[minField.value, maxField.value]}
        onChange={([min, max]) => {
          if (max === 0) {
            return;
          }

          if (min !== minField.value) {
            minField.onChange(min);
          }

          if (max !== maxField.value) {
            maxField.onChange(max);
          }
        }}
        className="mt-10 !hidden w-full max-w-md md:!flex"
      />

      <ControlledInput<ServiceForm, 'scaling.max'>
        name="scaling.max"
        type="number"
        label={<T id="max" />}
        disabled={!canChangeScaling}
        readOnly={scaling.min === 0 && !scaleToZeroWithAutoscaling}
        helperText={scaling.min === 0 && !scaleToZeroWithAutoscaling && <T id="maxIsOneWhenMinIsZero" />}
        onKeyDown={onKeyDownPositiveInteger}
        min={Math.max(min, 1)}
        max={max}
        step={1}
        onBlur={(event) => handleScalingValueBlurred(event, setScalingValue('max'))}
        className="w-24"
      />
    </div>
  );
}

type ScalingTargetProps = {
  target: keyof Scaling['targets'];
  Icon: React.ComponentType<{ className?: string }>;
  min?: number;
  max?: number;
};

function ScalingTarget({ target: targetName, Icon, min, max }: ScalingTargetProps) {
  const { resetField, trigger } = useFormContext<ServiceForm>();
  const target = useWatchServiceForm(`scaling.targets.${targetName}`);
  const disabledReason = useTargetDisabledReason(targetName);

  return (
    <Tooltip content={disabledReason}>
      {(props) => (
        <div {...props}>
          <ControlledSelectBox<ServiceForm, `scaling.targets.${keyof Scaling['targets']}.enabled`>
            name={`scaling.targets.${targetName}.enabled`}
            type="checkbox"
            title={null}
            description={null}
            disabled={disabledReason !== undefined}
            onChangeEffect={(event) => {
              if (!event.target.checked) {
                resetField(`scaling.targets.${targetName}.value`);
                void trigger(`scaling.targets.${targetName}.value`);
              }
            }}
          >
            <div className="col sm:row flex-1 gap-4 p-3 sm:items-center">
              <div className="col flex-1 gap-1">
                <div className="row items-center gap-1 font-semibold">
                  <Icon className="icon" />
                  <T id={`${targetName}Label`} />
                </div>

                <div className="text-xs text-dim">
                  <TargetDescription target={targetName} />
                </div>
              </div>

              <ControlledInput
                name={`scaling.targets.${targetName}.value`}
                error={false}
                type="number"
                disabled={!target.enabled}
                onKeyDown={onKeyDownPositiveInteger}
                end={
                  <InputEnd>
                    <T id={`${targetName}Unit`} />
                  </InputEnd>
                }
                className="max-w-24 self-center"
                min={min}
                max={max}
                step={1}
              />
            </div>
          </ControlledSelectBox>
        </div>
      )}
    </Tooltip>
  );
}

function useTargetDisabledReason(target: keyof Scaling['targets']): React.ReactNode | undefined {
  const serviceType = useWatchServiceForm('serviceType');
  const min = useWatchServiceForm('scaling.min');
  const max = useWatchServiceForm('scaling.max');

  if (target === 'sleepIdleDelay' && min === 0) {
    return undefined;
  }

  if (min === 0 && max === 1) {
    return <T id="criteriaNotAvailableWhenMax1" />;
  }

  if (min === max) {
    return <T id="criteriaNotAvailableWithFixedScaling" />;
  }

  if (isWebTarget(target) && serviceType === 'worker') {
    return <T id="criterionNotAvailableWorker" />;
  }
}

function isWebTarget(target: keyof Scaling['targets']) {
  return inArray(target, ['requests', 'concurrentRequests', 'responseTime']);
}

type TargetDescriptionProps = {
  target: keyof Scaling['targets'];
};

function TargetDescription({ target }: TargetDescriptionProps) {
  const { errors } = useFormState<ServiceForm>();
  const error = errors.scaling?.targets?.[target]?.value?.message;
  let value = useWatchServiceForm(`scaling.targets.${target}.value`);

  if (target === 'cpu' || target === 'memory') {
    value /= 100;
  }

  if (error) {
    return <span className="text-red">{error}</span>;
  }

  return <T id={`${target}Description`} values={{ value }} />;
}

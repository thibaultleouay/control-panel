import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@koyeb/design-system';
import { useUser } from 'src/api/hooks/session';
import { useApiMutationFn, useInvalidateApiQuery } from 'src/api/use-api';
import { notify } from 'src/application/notify';
import { ControlledInput } from 'src/components/controlled';
import { FormValues, handleSubmit } from 'src/hooks/form';
import { useZodResolver } from 'src/hooks/validation';
import { Translate } from 'src/intl/translate';

const T = Translate.prefix('pages.userSettings.general.name');

const schema = z.object({
  name: z.string().min(2).max(128),
});

export function UserNameForm() {
  const t = T.useTranslate();
  const user = useUser();

  const form = useForm<z.infer<typeof schema>>({
    defaultValues: {
      name: user.name,
    },
    resolver: useZodResolver(schema),
  });

  const invalidate = useInvalidateApiQuery();

  const mutation = useMutation({
    ...useApiMutationFn('updateUser', ({ name }: FormValues<typeof form>) => ({
      query: {},
      body: { name },
    })),
    async onSuccess(_, { name }) {
      await invalidate('getCurrentUser');
      form.reset({ name });
      notify.success(t('successNotification', { name }));
    },
  });

  return (
    <form onSubmit={handleSubmit(form, mutation.mutateAsync)} className="card">
      <div className="p-4">
        <ControlledInput control={form.control} name="name" label={<T id="label" />} />
      </div>

      <footer>
        <p className="text-xs text-dim">
          <T id="footer" />
        </p>

        <Button
          type="submit"
          className="self-start"
          loading={form.formState.isSubmitting}
          disabled={!form.formState.isDirty || Object.keys(form.formState.errors).length > 0}
        >
          <Translate id="common.save" />
        </Button>
      </footer>
    </form>
  );
}

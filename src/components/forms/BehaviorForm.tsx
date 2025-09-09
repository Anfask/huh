"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "react-toastify";
import {
  behaviorSchema,
  type BehaviorSchema,
} from "@/lib/formValidationSchemas";
import { createBehavior, updateBehavior } from "@/lib/actions";

const BehaviorForm = ({
  type,
  data,
  setOpen,
}: {
  type: "create" | "update";
  data?: BehaviorSchema;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BehaviorSchema>({
    resolver: zodResolver(behaviorSchema),
    defaultValues: {
      id: data?.id || undefined,
      description: data?.description || "",
      point: data?.point || 0,
      isNegative: data?.isNegative || false,
      title: data?.title || "",
    },
  });

  const [state, formAction] = useActionState(
    type === "create" ? createBehavior : updateBehavior,
    {
      success: false,
      error: false,
      errorMessage: "",
    }
  );

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onSubmit = handleSubmit((formData) => {
    startTransition(() => {
      formAction(formData);
    });
  });

  useEffect(() => {
    if (state.success) {
      toast(`Behavior has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, type, setOpen, router]);

  return (
    <form onSubmit={onSubmit} className="max-w-3xl mx-auto p-4 space-y-6">
      <h2 className="text-xl font-semibold">
        {type === "create"
          ? "Create Student Behavior"
          : "Update Student Behavior"}
      </h2>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-400">
          Behavior Information
        </legend>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              {...register("title")}
              defaultValue={data?.title}
              className="w-full p-2 border rounded"
            />
            {errors.title && (
              <p className="text-red-500 text-xs mt-1">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Point
            </label>
            <input
              type="number"
              {...register("point")}
              defaultValue={data?.point}
              className="w-full p-2 border rounded"
            />
            {errors.point && (
              <p className="text-red-500 text-xs mt-1">
                {errors.point.message}
              </p>
            )}
          </div>

          <div>
            <label className="flex items-center mt-7">
              <input
                type="checkbox"
                {...register("isNegative")}
                defaultChecked={data?.isNegative || false}
                className="mr-2"
              />
              Is this negative behavior?
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              {...register("description")}
              defaultValue={data?.description}
              className="w-full p-2 border rounded"
              rows={3}
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          {data?.id && (
            <input type="hidden" {...register("id")} defaultValue={data.id} />
          )}
        </div>
      </fieldset>

      {state.error && state.errorMessage && (
        <p className="text-red-500 text-sm">{state.errorMessage}</p>
      )}

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isPending
            ? type === "create"
              ? "Creating..."
              : "Updating..."
            : type === "create"
            ? "Create"
            : "Update"}
        </button>
      </div>
    </form>
  );
};

export default BehaviorForm;
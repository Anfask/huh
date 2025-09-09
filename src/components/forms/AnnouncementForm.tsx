"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { type Dispatch, type SetStateAction, useEffect } from "react";
import {
  announcementSchema,
  type AnnouncementSchema,
} from "@/lib/formValidationSchemas";
import { useActionState, useTransition } from "react";
import { createAnnouncement, updateAnnouncement } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

const AnnouncementForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AnnouncementSchema>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      id: data?.id ?? undefined,
      title: data?.title ?? "",
      description: data?.description ?? "",
      classId: data?.classId ?? undefined,
      date: data?.date ? new Date(data.date).toISOString().slice(0, 16) : "",
    },
  });

  const [state, formAction] = useActionState(
    type === "create" ? createAnnouncement : updateAnnouncement,
    { success: false, error: false }
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onSubmit = handleSubmit((data) => {
    startTransition(() => {
      formAction(data);
    });
  });

  useEffect(() => {
    if (state.success) {
      toast.success(`Announcement ${type === "create" ? "created" : "updated"} successfully!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const { classes = [] } = relatedData || {};

  return (
    <form onSubmit={onSubmit} className="max-w-3xl mx-auto p-4 space-y-6">
      <h2 className="text-xl font-semibold">
        {type === "create" ? "Create Announcement" : "Update Announcement"}
      </h2>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-400">Announcement Information</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              {...register("title")}
              className="w-full p-2 border rounded"
            />
            {errors.title?.message && (
              <p className="text-xs text-red-500 mt-1">{errors.title.message.toString()}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="datetime-local"
              {...register("date")}
              className="w-full p-2 border rounded"
            />
            {errors.date?.message && (
              <p className="text-xs text-red-500 mt-1">{errors.date.message.toString()}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              {...register("description")}
              className="w-full p-2 border rounded min-h-32"
            />
            {errors.description?.message && (
              <p className="text-xs text-red-500 mt-1">{errors.description.message.toString()}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Class (Optional)</label>
            <select
              {...register("classId")}
              className="w-full p-2 border rounded"
            >
              <option value="">All Classes</option>
              {classes.map((classItem: { id: number; name: string }) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </option>
              ))}
            </select>
            {errors.classId?.message && (
              <p className="text-xs text-red-500 mt-1">{errors.classId.message.toString()}</p>
            )}
          </div>

          {data?.id && (
            <input type="hidden" {...register("id")} />
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
            ? type === "create" ? "Creating..." : "Updating..."
            : type === "create" ? "Create" : "Update"}
        </button>
      </div>
    </form>
  );
};

export default AnnouncementForm;
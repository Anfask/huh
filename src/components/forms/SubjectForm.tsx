"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { subjectSchema, SubjectSchema } from "@/lib/formValidationSchemas";
import { createSubject, updateSubject } from "@/lib/actions";
import { useActionState, useTransition } from "react";
import { Dispatch, SetStateAction, useEffect } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

const SubjectForm = ({
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
    watch,
    setValue,
  } = useForm<SubjectSchema>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: data?.name || "",
      teachers: data?.teachers?.map((teacher: any) => teacher.id) || [],
    },
  });

  const [state, formAction] = useActionState(
    type === "create" ? createSubject : updateSubject,
    {
      success: false,
      error: false,
    }
  );
  
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { teachers } = relatedData;
  const selectedTeachers = watch("teachers") || [];

  const onSubmit = handleSubmit((formData) => {
    startTransition(() => {
      formAction(formData);
    });
  });

  const handleTeacherChange = (teacherId: string, isChecked: boolean) => {
    const newTeachers = isChecked
      ? [...selectedTeachers, teacherId]
      : selectedTeachers.filter((id) => id !== teacherId);
    setValue("teachers", newTeachers);
  };

  useEffect(() => {
    if (state.success) {
      toast(`Subject has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  return (
    <form onSubmit={onSubmit} className="max-w-3xl mx-auto p-4 space-y-6">
      <h2 className="text-xl font-semibold">
        {type === "create" ? "Create Subject" : "Update Subject"}
      </h2>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-400">Subject Information</legend>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              {...register("name")}
              defaultValue={data?.name}
              className="w-full p-2 border rounded"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          {data?.id && (
            <input type="hidden" {...register("id")} defaultValue={data.id} />
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-400">Teachers (Optional)</legend>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded scrollbar-hide">
          {teachers.map((teacher: { id: string; name: string; surname: string }) => (
            <label key={teacher.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedTeachers.includes(teacher.id)}
                onChange={(e) => handleTeacherChange(teacher.id, e.target.checked)}
              />
              {teacher.name} {teacher.surname}
            </label>
          ))}
        </div>
        {errors.teachers && <p className="text-red-500 text-xs mt-1">{errors.teachers.message}</p>}
      </fieldset>

      {state.error && (
        <p className="text-red-500 text-sm">
          {state.errorMessage || "Something went wrong!"}
        </p>
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

export default SubjectForm;
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Image from "next/image";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { studentSchema, StudentSchema } from "@/lib/formValidationSchemas";
import { useActionState, useTransition } from "react";
import { createStudent, updateStudent } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CldUploadWidget } from "next-cloudinary";

const StudentForm = ({
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
    watch, // 👈 added
  } = useForm<StudentSchema>({
    resolver: zodResolver(studentSchema),
  });

  const [img, setImg] = useState<any>();
  const [state, formAction] = useActionState(
    type === "create" ? createStudent : updateStudent,
    { success: false, error: false }
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onSubmit = handleSubmit((data) => {
    startTransition(() => {
      formAction({ ...data, img: img?.secure_url });
    });
  });

  useEffect(() => {
    if (state.success) {
      toast(
        `Student ${type === "create" ? "created" : "updated"} successfully!`
      );
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const { grades, classes, parents, usedRollNos } = relatedData;

  const selectedClassId = watch("classId") || data?.classId; // 👈 fallback to existing

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-3xl mx-auto p-4 space-y-6 h-[70vh] overflow-scroll scrollbar-hide"
    >
      <h2 className="text-xl font-semibold">
        {type === "create" ? "Create Student" : "Update Student"}
      </h2>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-400">
          Authentication
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              {...register("username")}
              defaultValue={data?.username}
              className="w-full p-2 border rounded"
            />
            {errors.username && (
              <p className="text-red-500 text-xs mt-1">
                {errors.username.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              {...register("email")}
              defaultValue={data?.email}
              className="w-full p-2 border rounded"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              {...register("password")}
              defaultValue={data?.password}
              className="w-full p-2 border rounded"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">
                {errors.password.message}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-400">
          Personal Information
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">First Name</label>
            <input
              {...register("name")}
              defaultValue={data?.name}
              className="w-full p-2 border rounded"
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Name</label>
            <input
              {...register("surname")}
              defaultValue={data?.surname}
              className="w-full p-2 border rounded"
            />
            {errors.surname && (
              <p className="text-red-500 text-xs mt-1">
                {errors.surname.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              {...register("phone")}
              defaultValue={data?.phone}
              className="w-full p-2 border rounded"
            />
            {errors.phone && (
              <p className="text-red-500 text-xs mt-1">
                {errors.phone.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input
              {...register("address")}
              defaultValue={data?.address}
              className="w-full p-2 border rounded"
            />
            {errors.address && (
              <p className="text-red-500 text-xs mt-1">
                {errors.address.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Blood Type</label>
            <select
              {...register("bloodType")}
              defaultValue={data?.bloodType}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Blood Type</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
            {errors.bloodType && (
              <p className="text-red-500 text-xs mt-1">
                {errors.bloodType.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Birthday</label>
            <input
              type="date"
              {...register("birthday")}
              defaultValue={data?.birthday?.toISOString().split("T")[0]}
              className="w-full p-2 border rounded"
            />
            {errors.birthday && (
              <p className="text-red-500 text-xs mt-1">
                {errors.birthday.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sex</label>
            <select
              {...register("sex")}
              defaultValue={data?.sex}
              className="w-full p-2 border rounded"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
            {errors.sex && (
              <p className="text-red-500 text-xs mt-1">{errors.sex.message}</p>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-400">
          School Information
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Parent</label>
            <select
              {...register("parentId")}
              defaultValue={data?.parentId}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Parent</option>
              {parents.map((parent: any) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name} {parent.surname}
                </option>
              ))}
            </select>
            {errors.parentId && (
              <p className="text-red-500 text-xs mt-1">
                {errors.parentId.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Grade</label>
            <select
              {...register("gradeId")}
              defaultValue={data?.gradeId}
              className="w-full p-2 border rounded"
            >
              {grades.map((grade: { id: number; level: number }) => (
                <option key={grade.id} value={grade.id}>
                  {grade.level}
                </option>
              ))}
            </select>
            {errors.gradeId && (
              <p className="text-red-500 text-xs mt-1">
                {errors.gradeId.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Class</label>
            <select
              {...register("classId")}
              defaultValue={data?.classId}
              className="w-full p-2 border rounded"
            >
              {classes.map((classItem: any) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name} ({classItem._count?.students || 0}/
                  {classItem.capacity})
                </option>
              ))}
            </select>
            {errors.classId && (
              <p className="text-red-500 text-xs mt-1">
                {errors.classId.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Roll No</label>
            <select
              {...register("rollNo", { valueAsNumber: true })}
              defaultValue={data?.rollNo ?? ""}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Roll No</option>
              {(() => {
                const selectedClass = classes.find(
                  (c: any) => c.id === Number(selectedClassId)
                );
                if (!selectedClass) return null;

                const capacity = selectedClass.capacity;
                const used = usedRollNos[selectedClass.id] || [];

                return Array.from({ length: capacity }, (_, i) => i + 1).map(
                  (roll) => {
                    const isDisabled =
                      used.includes(roll) && roll !== data?.rollNo;

                    return (
                      <option key={roll} value={roll} disabled={isDisabled}>
                        {roll}
                      </option>
                    );
                  }
                );
              })()}
            </select>
            {errors.rollNo && (
              <p className="text-red-500 text-xs mt-1">
                {errors.rollNo.message}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-400">Photo</legend>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden">
            <Image
              src={img?.secure_url || data?.img || "/noAvatar.png"}
              alt=""
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </div>
          <CldUploadWidget
            uploadPreset="school"
            onSuccess={(result, { widget }) => {
              setImg(result.info);
              widget.close();
            }}
          >
            {({ open }) => (
              <button
                type="button"
                onClick={() => open()}
                className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
              >
                Upload Photo
              </button>
            )}
          </CldUploadWidget>
        </div>
      </fieldset>

      {data && (
        <input type="hidden" {...register("id")} defaultValue={data?.id} />
      )}

      {state.error && state.errorMessage && (
        <p className="text-red-500 text-sm">{state.errorMessage}</p>
      )}

      <div className="flex justify-end gap-4 pt-4">
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

export default StudentForm;

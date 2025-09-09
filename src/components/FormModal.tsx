"use client";

import {
  deleteAnnouncement,
  deleteAssignment,
  deleteAttendance,
  deleteClass,
  deleteEvent,
  deleteExam,
  deleteLesson,
  deleteParent,
  deleteResult,
  deleteStudent,
  deleteSubject,
  deleteTeacher,
  deleteFee,
  deleteBehavior,
  deleteIncident,
} from "@/lib/actions";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "react-toastify";
import { FormContainerProps } from "./FormContainer";
import DeleteConfirmation from "./confirmModal";
import FormLoadingSkeleton from "./FormLoadingSkeleton";
import LoadingSpinner from "./LoadingSpinner";

// Dynamic Imports
const TeacherForm = dynamic(() => import("./forms/TeacherForm"), {
  loading: () => <FormLoadingSkeleton formType="teacher" />,
  ssr: false,
});
const StudentForm = dynamic(() => import("./forms/StudentForm"), {
  loading: () => <FormLoadingSkeleton formType="student" />,
  ssr: false,
});
const SubjectForm = dynamic(() => import("./forms/SubjectForm"), {
  loading: () => <FormLoadingSkeleton formType="subject" />,
  ssr: false,
});
const ClassForm = dynamic(() => import("./forms/ClassForm"), {
  loading: () => <FormLoadingSkeleton formType="class" />,
  ssr: false,
});
const ExamForm = dynamic(() => import("./forms/ExamForm"), {
  loading: () => <FormLoadingSkeleton formType="exam" />,
  ssr: false,
});
const ParentForm = dynamic(() => import("./forms/ParentForm"), {
  loading: () => <FormLoadingSkeleton formType="parent" />,
  ssr: false,
});
const LessonForm = dynamic(() => import("./forms/LessonForm"), {
  loading: () => <FormLoadingSkeleton formType="lesson" />,
  ssr: false,
});
const AnnouncementForm = dynamic(() => import("./forms/AnnouncementForm"), {
  loading: () => <FormLoadingSkeleton formType="announcement" />,
  ssr: false,
});
const AssignmentForm = dynamic(() => import("./forms/AssignmentForm"), {
  loading: () => <FormLoadingSkeleton formType="assignment" />,
  ssr: false,
});
const ResultForm = dynamic(() => import("./forms/ResultForm"), {
  loading: () => <FormLoadingSkeleton formType="result" />,
  ssr: false,
});
const AttendanceForm = dynamic(() => import("./forms/AttendanceForm"), {
  loading: () => <FormLoadingSkeleton formType="attendance" />,
  ssr: false,
});
const TeacherAttendanceForm = dynamic(
  () => import("./forms/TeacherAttendanceForm"),
  {
    loading: () => <FormLoadingSkeleton formType="attendance" />,
    ssr: false,
  }
);
const EventForm = dynamic(() => import("./forms/EventForm"), {
  loading: () => <FormLoadingSkeleton formType="event" />,
  ssr: false,
});
const FeeForm = dynamic(() => import("./forms/FeeForm"), {
  loading: () => <FormLoadingSkeleton formType="fee" />,
  ssr: false,
});
const BehaviorForm = dynamic(() => import("./forms/BehaviorForm"), {
  loading: () => <FormLoadingSkeleton formType="behavior" />,
  ssr: false,
});
const IncidentForm = dynamic(() => import("./forms/IncidentForm"), {
  loading: () => <FormLoadingSkeleton formType="remark" />,
  ssr: false,
});

// Delete actions mapping
const deleteActionMap = {
  subject: deleteSubject,
  class: deleteClass,
  teacher: deleteTeacher,
  student: deleteStudent,
  exam: deleteExam,
  parent: deleteParent,
  lesson: deleteLesson,
  assignment: deleteAssignment,
  result: deleteResult,
  attendance: deleteAttendance,
  event: deleteEvent,
  announcement: deleteAnnouncement,
  teacherAttendance: deleteAttendance,
  fee: deleteFee,
  behavior: deleteBehavior,
  incident: deleteIncident,
};

// Forms mapping
const forms: {
  [key: string]: (
    setOpen: Dispatch<SetStateAction<boolean>>,
    type: "create" | "update",
    data?: any,
    relatedData?: any
  ) => JSX.Element;
} = {
  subject: (setOpen, type, data, relatedData) => (
    <SubjectForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  class: (setOpen, type, data, relatedData) => (
    <ClassForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  teacher: (setOpen, type, data, relatedData) => (
    <TeacherForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  student: (setOpen, type, data, relatedData) => (
    <StudentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  exam: (setOpen, type, data, relatedData) => (
    <ExamForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  parent: (setOpen, type, data, relatedData) => (
    <ParentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  lesson: (setOpen, type, data, relatedData) => (
    <LessonForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  announcement: (setOpen, type, data, relatedData) => (
    <AnnouncementForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  assignment: (setOpen, type, data, relatedData) => (
    <AssignmentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  result: (setOpen, type, data, relatedData) => (
    <ResultForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  attendance: (setOpen, type, data, relatedData) => (
    <AttendanceForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  teacherAttendance: (setOpen, type, data, relatedData) => (
    <TeacherAttendanceForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  event: (setOpen, type, data, relatedData) => (
    <EventForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  fee: (setOpen, type, data, relatedData) => (
    <FeeForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  behavior: (setOpen, type, data, relatedData) => (
    <BehaviorForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  incident: (setOpen, type, data, relatedData) => (
    <IncidentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
};

const FormModal = ({
  table,
  type,
  data,
  id,
  relatedData,
}: FormContainerProps & { relatedData?: any }) => {
  const size = type === "create" ? "w-8 h-8" : "w-7 h-7";
  const bgColor =
    type === "create"
      ? "bg-lamaYellow"
      : type === "update"
      ? "bg-lamaSky"
      : "bg-lamaPurple";

  const [open, setOpen] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const Form = () => {
    const [isPending] = useTransition();
    const [state, formAction] = useActionState(deleteActionMap[table], {
      success: false,
      error: false,
    });

    useEffect(() => {
      if (state.success) {
        toast(`${table} has been deleted!`);
        setOpen(false);
        router.refresh();
      }
    }, [state.success]);

    useEffect(() => {
      if (state.error && state.errorMessage) {
        toast.error(state.errorMessage);
      }
    }, [state.error, state.errorMessage]);

    if (type === "delete" && id) {
      return (
        <DeleteConfirmation
          id={id}
          table={table}
          formAction={formAction}
          isPending={isPending}
          setOpen={setOpen}
        />
      );
    }

    if (type === "create" || type === "update") {
      const FormComponent = forms[table];
      return FormComponent ? (
        FormComponent(setOpen, type, data, relatedData)
      ) : (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-16 h-16 mb-4 text-gray-400">
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">Form not available</p>
          <p className="text-gray-500 text-sm mt-1">
            The requested form could not be loaded
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-16 h-16 mb-4 text-red-400">
          <svg fill="currentColor" viewBox="0 0 24 24">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
        </div>
        <p className="text-red-600 font-medium">Invalid form type</p>
        <p className="text-gray-500 text-sm mt-1">
          Please check the form configuration
        </p>
      </div>
    );
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleModalOpen = () => {
    setOpen(true);
    setIsFormLoading(true);
  };

  return (
    <>
      <button
        className={`${size} flex items-center justify-center rounded-full ${bgColor} hover:opacity-90 transition-all duration-200 hover:scale-105 active:scale-95`}
        onClick={handleModalOpen}
        disabled={open}
      >
        {open && isFormLoading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <Image src={`/${type}.png`} alt={type} width={16} height={16} />
        )}
      </button>

      {open && (
        <div className="w-full fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center overflow-y-scroll scrollbar-hide">
          <div
            ref={modalRef}
            className="relative bg-white p-6 rounded-xl shadow-lg w-[90%] max-w-2xl animate-fadeIn"
          >
            <Form />
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:rotate-90 transition-all duration-300"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default FormModal;
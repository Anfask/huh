import { Dispatch, SetStateAction } from "react";

interface DeleteConfirmationProps {
  id: number | string;
  table: string;
  formAction: (formData: FormData) => void;
  isPending: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  customMessage?: string;
  customWarning?: string;
}

const DeleteConfirmation = ({
  id,
  table,
  formAction,
  isPending,
  setOpen,
  customMessage,
  customWarning,
}: DeleteConfirmationProps) => {
  return (
    <form action={formAction} className="p-6 flex flex-col gap-6">
      <input type="hidden" name="id" value={id} />

      {/* Warning Icon */}
      <div className="flex justify-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h2 className="text-lg font-semibold text-gray-900 text-center">
        Delete {table}?
      </h2>

      {/* Warning Message */}
      <div className="text-center space-y-2">
        <p className="text-gray-600">
          {customMessage || 
            `This action cannot be undone. This will permanently delete the ${table}`
          }
        </p>
        <p className="text-sm text-gray-500">
          {customWarning || "All associated data will be lost forever."}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center pt-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 min-w-[100px] justify-center"
        >
          {isPending ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Deleting...
            </>
          ) : (
            "Delete"
          )}
        </button>
      </div>
    </form>
  );
};

export default DeleteConfirmation;
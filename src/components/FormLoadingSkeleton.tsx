const FormLoadingSkeleton = ({ formType }: { formType: string }) => {
  return (
    <div className="space-y-6 p-4">
      {/* Header skeleton */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full animate-pulse"></div>
        <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32 animate-pulse"></div>
      </div>

      {/* Form fields skeleton */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24 animate-pulse"></div>
            <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-full animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Additional fields for specific forms */}
      {(formType === "teacher" || formType === "student") && (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20 animate-pulse"></div>
              <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-full animate-pulse"></div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons skeleton */}
      <div className="flex justify-end space-x-3 pt-4">
        <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20 animate-pulse"></div>
        <div className="h-10 bg-gradient-to-r from-blue-200 to-blue-300 rounded w-24 animate-pulse"></div>
      </div>

      {/* Loading indicator */}
      <div className="flex items-center justify-center py-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
        </div>
        <span className="ml-3 text-sm text-gray-600 animate-pulse">
          Loading {formType} form...
        </span>
      </div>
    </div>
  );
};
export default FormLoadingSkeleton;

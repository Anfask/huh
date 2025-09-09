"use client";

import Select from "react-select";
import { FieldError, UseFormRegister } from "react-hook-form";
import { useEffect, useState } from "react";

interface Option {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  label: string;
  name: string;
  options: Option[];
  defaultValue?: Option;
  error?: FieldError;
  register: UseFormRegister<any>;
}

const SearchableSelect = ({
  label,
  name,
  options,
  defaultValue,
  error,
  register,
}: SearchableSelectProps) => {
  const [selectedValue, setSelectedValue] = useState<Option | null>(
    defaultValue || null
  );

  // Register the field with react-hook-form
  const { onChange, ...registerProps } = register(name);

  // Update the form value whenever selection changes
  useEffect(() => {
    onChange({
      target: {
        name,
        value: selectedValue?.value || "",
      },
    });
  }, [selectedValue, onChange, name]);

  return (
    <div className="flex flex-col gap-2 w-full md:w-1/4">
      <label className="text-xs text-gray-500">{label}</label>
      <Select
        options={options}
        value={selectedValue}
        onChange={(selected) => {
          setSelectedValue(selected);
        }}
        isSearchable
        placeholder={`Select ${label}...`}
        className="text-sm"
      />

      {/* Hidden input for form submission */}
      <input
        type="hidden"
        {...registerProps}
        value={selectedValue?.value || ""}
      />

      {error && <p className="text-xs text-red-400">{error.message}</p>}
    </div>
  );
};

export default SearchableSelect;

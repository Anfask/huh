'use client';
import { useState } from "react";
import Calendar, { CalendarProps } from "react-calendar";

const EventCalendar = () => {
  const [value, setValue] = useState<CalendarProps["value"]>(new Date());

  return (
    <Calendar
      value={value}
      onChange={setValue}
      className="rounded-md shadow-sm"
    />
  );
};

export default EventCalendar;

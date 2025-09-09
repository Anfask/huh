import EventCalendarClient from "./EventCalendarClient";

type Props = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

const EventCalendarContainer = async ({ searchParams = {} }: Props) => {
  const rawDate = searchParams.date;

  // Normalize possible array value to string
  const dateString = Array.isArray(rawDate) ? rawDate[0] : rawDate;

  const selectedDate = dateString ? new Date(dateString) : new Date();

  return (
    <div className="bg-white p-4 rounded-md shadow-md">
      <EventCalendarClient selectedDate={selectedDate} />
    </div>
  );
};

export default EventCalendarContainer;

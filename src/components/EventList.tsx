
import prisma from "@/lib/prisma";

const EventList = async ({ dateParam }: { dateParam?: string }) => {
  const date = dateParam ? new Date(dateParam) : new Date();

  const events = await prisma.event.findMany({
    where: {
      startTime: {
        gte: new Date(date.setHours(0, 0, 0, 0)),
        lt: new Date(date.setHours(23, 59, 59, 999)),
      },
    },
    orderBy: {
      startTime: "asc",
    },
  });

  return (
    <ul className="flex flex-col gap-2">
      {events.length === 0 ? (
        <li className="text-gray-500">No events for this day</li>
      ) : (
        events.map((event) => (
          <li key={event.id}>
            <strong>{event.title}</strong> @ {new Date(event.startTime).toLocaleTimeString()}
          </li>
        ))
      )}
    </ul>
  );
};

export default EventList;

import EventList from "./EventList";

const EventListWrapper = async ({ dateParam }: { dateParam?: string }) => {
  return <EventList dateParam={dateParam} />;
};

export default EventListWrapper;

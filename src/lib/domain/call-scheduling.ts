import { formatZonedTime, officeToTimeZone } from "@/lib/timezone";

const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

function localPartsInTimeZone(date: Date, timeZone: string): Record<string, number> | null {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      calendar: "iso8601",
      numberingSystem: "latn",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);

    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );

    return {
      year: values.year,
      month: values.month,
      day: values.day,
      hour: values.hour,
      minute: values.minute,
      second: values.second,
    };
  } catch {
    return null;
  }
}

export function parseOfficeLocalDateTime(localDateTime: string, officeId: string): Date | null {
  const match = LOCAL_DATE_TIME_PATTERN.exec(localDateTime);
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText = "0"] = match;
  const target = {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
    hour: Number(hourText),
    minute: Number(minuteText),
    second: Number(secondText),
  };
  const targetAsUtc = Date.UTC(
    target.year,
    target.month - 1,
    target.day,
    target.hour,
    target.minute,
    target.second,
  );
  const normalized = new Date(targetAsUtc);

  if (
    normalized.getUTCFullYear() !== target.year ||
    normalized.getUTCMonth() + 1 !== target.month ||
    normalized.getUTCDate() !== target.day
  ) {
    return null;
  }

  const timeZone = officeToTimeZone(officeId);
  const initialLocal = localPartsInTimeZone(new Date(targetAsUtc), timeZone);
  if (!initialLocal) return null;

  const localAsUtc = Date.UTC(
    initialLocal.year,
    initialLocal.month - 1,
    initialLocal.day,
    initialLocal.hour,
    initialLocal.minute,
    initialLocal.second,
  );
  const result = new Date(targetAsUtc - (localAsUtc - targetAsUtc));
  const verifiedLocal = localPartsInTimeZone(result, timeZone);

  if (
    !verifiedLocal ||
    verifiedLocal.year !== target.year ||
    verifiedLocal.month !== target.month ||
    verifiedLocal.day !== target.day ||
    verifiedLocal.hour !== target.hour ||
    verifiedLocal.minute !== target.minute ||
    verifiedLocal.second !== target.second
  ) {
    return null;
  }

  return result;
}

export function getCallSchedulingError(
  callResult: string,
  callbackDate: string,
  callbackTime: string,
  appointmentDateTime: string,
  officeId: string,
): string | null {
  if (callResult === "Callback") {
    if (!callbackDate || !callbackTime) return "Callback date and time are required.";
    if (!parseOfficeLocalDateTime(`${callbackDate}T${callbackTime}`, officeId)) {
      return "Enter a valid callback date and time.";
    }
  }

  if (callResult === "Booked") {
    if (!appointmentDateTime) return "Appointment date and time are required.";
    if (!parseOfficeLocalDateTime(appointmentDateTime, officeId)) {
      return "Enter a valid appointment date and time.";
    }
  }

  return null;
}

export function buildAppointmentActivityData(appointmentAt: Date, officeId: string) {
  return {
    type: "appointment_booked" as const,
    description: `Appointment booked for ${formatZonedTime(
      appointmentAt,
      officeToTimeZone(officeId),
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      },
    )}`,
    metadata: { callResult: "Booked", appointmentAt },
  };
}

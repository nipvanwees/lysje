"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";

// Common timezones list
const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Europe/Rome", label: "Rome (CET/CEST)" },
  { value: "Europe/Madrid", label: "Madrid (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "Mumbai/New Delhi (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT/AEST)" },
  { value: "Australia/Melbourne", label: "Melbourne (AEDT/AEST)" },
  { value: "Pacific/Auckland", label: "Auckland (NZDT/NZST)" },
];

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function SettingsPage() {
  const { data: settings, isLoading } = api.user.getSettings.useQuery();
  const utils = api.useUtils();
  const updateSettings = api.user.updateSettings.useMutation({
    onSuccess: () => {
      void utils.user.getSettings.invalidate();
    },
  });

  const [notificationTime, setNotificationTime] = useState("09:00");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [timezone, setTimezone] = useState<string>("");
  const [availableTimezones, setAvailableTimezones] = useState(TIMEZONES);

  // Initialize form with current settings and add browser timezone if needed
  useEffect(() => {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const browserTzExists = TIMEZONES.some((tz) => tz.value === browserTimezone);
    
    if (!browserTzExists) {
      // Add browser timezone to the list
      const browserTzLabel = new Intl.DateTimeFormat("en-US", {
        timeZone: browserTimezone,
        timeZoneName: "short",
      })
        .formatToParts(new Date())
        .find((part) => part.type === "timeZoneName")?.value ?? browserTimezone;
      
      setAvailableTimezones([
        { value: browserTimezone, label: `${browserTimezone} (${browserTzLabel})` },
        ...TIMEZONES,
      ]);
    }

    if (settings) {
      if (settings.notificationTime) {
        setNotificationTime(settings.notificationTime);
      }
      if (settings.notificationDays) {
        setSelectedDays(settings.notificationDays);
      }
      if (settings.timezone) {
        setTimezone(settings.timezone);
      } else {
        // Default to user's browser timezone
        setTimezone(browserTimezone);
      }
    }
  }, [settings]);

  const handleDayToggle = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate({
      notificationTime: notificationTime ?? null,
      notificationDays: selectedDays.length > 0 ? selectedDays : null,
      timezone: timezone ?? null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-600">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-lg bg-[#141414] p-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-100">
          Email Notification Settings
        </h2>
        <p className="mb-6 text-sm text-gray-400">
          Configure when and on which days you want to receive email notifications
          about your open todo items.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Timezone Selection */}
          <div>
            <label
              htmlFor="timezone"
              className="mb-2 block text-sm font-medium text-gray-300"
            >
              Timezone
            </label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded border border-[#252525] bg-[#0f0f0f] px-3 py-2 text-sm text-gray-200 focus:border-[#333] focus:outline-none"
              required
            >
              <option value="">Select a timezone</option>
              {availableTimezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Your local timezone for scheduling notifications
            </p>
          </div>

          {/* Notification Time */}
          <div>
            <label
              htmlFor="notificationTime"
              className="mb-2 block text-sm font-medium text-gray-300"
            >
              Notification Time
            </label>
            <input
              type="time"
              id="notificationTime"
              value={notificationTime}
              onChange={(e) => setNotificationTime(e.target.value)}
              className="w-full rounded border border-[#252525] bg-[#0f0f0f] px-3 py-2 text-sm text-gray-200 focus:border-[#333] focus:outline-none"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              The time of day (in your timezone) when you want to receive
              notifications
            </p>
          </div>

          {/* Notification Days */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Notification Days
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DAYS.map((day) => (
                <label
                  key={day.value}
                  className="flex cursor-pointer items-center gap-2 rounded border border-[#252525] bg-[#0f0f0f] px-3 py-2 transition hover:bg-[#141414]"
                >
                  <input
                    type="checkbox"
                    checked={selectedDays.includes(day.value)}
                    onChange={() => handleDayToggle(day.value)}
                    className="h-4 w-4 rounded border-[#252525] bg-[#0f0f0f] text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">{day.label}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Select the days of the week when you want to receive notifications
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="submit"
              disabled={updateSettings.isPending || selectedDays.length === 0}
              className="rounded bg-[#1a1a1a] px-6 py-2 text-sm font-semibold text-gray-300 transition hover:bg-[#222] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateSettings.isPending ? "Saving..." : "Save Settings"}
            </button>
          </div>

          {updateSettings.isSuccess && (
            <div className="rounded bg-green-900/20 border border-green-800 px-4 py-3 text-sm text-green-400">
              Settings saved successfully!
            </div>
          )}

          {updateSettings.isError && (
            <div className="rounded bg-red-900/20 border border-red-800 px-4 py-3 text-sm text-red-400">
              Failed to save settings. Please try again.
            </div>
          )}
        </form>
      </div>
    </div>
  );
}


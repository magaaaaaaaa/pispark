import { describe, expect, it } from "vitest";
import { STAGES, WINDOWS } from "@/lib/config";

describe("config", () => {
  it("lists the seven lead stages in pipeline order", () => {
    expect(STAGES).toEqual([
      "new",
      "trial_booked",
      "trial_done",
      "offer_sent",
      "paying",
      "not_now",
      "lost",
    ]);
  });

  it("offers trial windows for US evenings and US weekend mornings in owner time", () => {
    expect(WINDOWS).toEqual([
      { days: [2, 3, 4, 5, 6], startHour: 5, endHour: 10 },
      { days: [6, 0], startHour: 19, endHour: 23 },
    ]);
  });
});

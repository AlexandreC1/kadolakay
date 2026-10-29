import { describe, expect, it } from "vitest";
import { businessFormErrors } from "./business-form-validation";
describe("business registration error collection", () => {
  it("reports all missing required fields together", () => {
    expect(businessFormErrors({ name: "", category: "" })).toEqual([
      { field: "name", code: "nameRequired" }, { field: "category", code: "categoryRequired" },
    ]);
  });
  it("collects an invalid optional identifier together with required errors", () => {
    const errors = businessFormErrors({ name: "  ", category: "", patenteNumber: "<script>" });
    expect(errors).toHaveLength(3);
    expect(errors).toContainEqual({ field: "patenteNumber", code: "patenteError" });
    expect(errors.filter(error => error.field === "name")).toHaveLength(1);
  });
  it("does not invent required fields from optional empty controls", () => {
    expect(businessFormErrors({ name: "My shop", category: "home", patenteNumber: "", phone: "", whatsapp: "", moncashNumber: "", natcashNumber: "" })).toEqual([]);
  });
  it("identifies excessive optional content without exposing raw validation details", () => {
    expect(businessFormErrors({ name: "My shop", category: "home", description: "x".repeat(2001) })).toEqual([{ field: "description", code: "fieldInvalid" }]);
    expect(businessFormErrors({ name: "My shop", category: "home", userId: "victim" })).toEqual([{ field: null, code: "fieldInvalid" }]);
  });
  it("removes corrected field errors while retaining other unresolved errors", () => {
    expect(businessFormErrors({ name: "My shop", category: "", patenteNumber: "00123" })).toEqual([{ field: "category", code: "categoryRequired" }]);
  });
});

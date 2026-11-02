"use client";
import { useState } from "react";
import { FoundationForm } from "@/components/shared/FoundationForm";
import { savePrivacy } from "@/actions/baskets";
import { workspaceCopy } from "@/lib/workspace-copy";
export function PrivacyForm({
  registry,
  locale,
}: {
  registry: {
    id: string;
    visibility: string;
    searchable: boolean;
    kind: string;
  };
  locale: string;
}) {
  const c = workspaceCopy(locale);
  const [visibility, setVisibility] = useState(registry.visibility);
  const [searchable, setSearchable] = useState(registry.searchable);
  return (
    <section className="foundation-panel workspace-section">
      <h2>{c.privacy}</h2>
      <FoundationForm action={savePrivacy} locale={locale} label={c.save}>
        <input type="hidden" name="registryId" value={registry.id} />
        <label htmlFor={`visibility-${registry.id}`}>{c.visibility}</label>
        <select
          name="visibility"
          id={`visibility-${registry.id}`}
          value={visibility}
          onChange={(event) => {
            setVisibility(event.target.value);
            if (event.target.value !== "PUBLIC") setSearchable(false);
          }}
        >
          {(["PUBLIC", "UNLISTED", "PRIVATE", "PROTECTED"] as const).map(
            (v) => (
              <option value={v} key={v}>
                {c[v]}
              </option>
            ),
          )}
        </select>
        <label className="workspace-check">
          <input
            type="checkbox"
            name="searchable"
            value="true"
            checked={searchable}
            onChange={(event) => setSearchable(event.target.checked)}
            disabled={
              registry.kind === "BASKET_PERSONAL" || visibility !== "PUBLIC"
            }
          />
          {c.searchable}
        </label>
        <label htmlFor={`password-${registry.id}`}>{c.password}</label>
        <input
          type="password"
          disabled={visibility !== "PROTECTED"}
          required={
            visibility === "PROTECTED" && registry.visibility !== "PROTECTED"
          }
          name="password"
          id={`password-${registry.id}`}
          minLength={10}
          maxLength={128}
          autoComplete="new-password"
          aria-describedby={`privacy-hint-${registry.id}`}
        />
        <p id={`privacy-hint-${registry.id}`} className="foundation-note">
          {c.passwordHint}
        </p>
      </FoundationForm>
    </section>
  );
}

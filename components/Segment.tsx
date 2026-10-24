"use client";

import { Fragment, useId } from "react";

export type SegmentOption<T extends string> = { value: T; label: string; wide?: boolean };

/** Grup radio yang tampil sebagai tombol segmen. */
export function Segment<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = 3,
}: {
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  columns?: 2 | 3;
}) {
  const id = useId();
  return (
    <div className="field">
      <span className="flabel" id={`${id}-l`}>
        {label}
      </span>
      <div className={columns === 2 ? "seg two" : "seg"} role="radiogroup" aria-labelledby={`${id}-l`}>
        {options.map((o) => {
          const oid = `${id}-${o.value}`;
          return (
            <Fragment key={o.value}>
              <input
                type="radio"
                id={oid}
                name={id}
                value={o.value}
                checked={value === o.value}
                onChange={() => onChange(o.value)}
              />
              <label htmlFor={oid} className={o.wide ? "wide" : undefined}>
                {o.label}
              </label>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

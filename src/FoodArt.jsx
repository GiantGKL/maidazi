import React from "react";

// Original vector illustrations: no remote assets, no official product photography.
export function FoodArt({ type = "beef", size = 100 }) {
  const burger = ["beef", "chicken", "spicy", "fish"].includes(type);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 140"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="80" cy="123" rx="52" ry="8" fill="#432711" opacity=".08" />
      {burger ? (
        <g>
          <path d="M29 99h102c0 15-13 22-51 22s-51-7-51-22Z" fill="#E4A24C" />
          <path d="M31 102h98c-4 9-19 12-49 12s-46-3-49-12Z" fill="#F8BE6A" />
          <rect
            x="25"
            y="85"
            width="110"
            height="20"
            rx="10"
            fill={
              type === "beef"
                ? "#774029"
                : type === "fish"
                  ? "#D9A24D"
                  : "#BF702C"
            }
          />
          <path d="m29 84 25-3 27 18 25-17 27 4-6-11H32Z" fill="#FFD658" />
          <path
            d="M24 74c9-13 15 4 23-6 10-12 17 7 29 0 9-8 14 7 23 0 9-9 16 7 35 5l-3 11c-13-4-17 5-28-1-11-7-13 5-26-1-12-6-16 5-25 0-10-6-14 4-25 0Z"
            fill="#78A549"
          />
          <path
            d="M30 63h100v9c-9 5-18 0-28 3-8 3-15 0-24 0-10 0-13 4-24 1-11-4-19 2-24-3Z"
            fill={type === "spicy" ? "#D94B34" : "#F4ECD2"}
          />
          <path
            d="M24 64c3-28 23-44 56-44s53 16 56 44c0 7-112 7-112 0Z"
            fill="#EDAD54"
          />
          <path
            d="M32 54c7-19 23-28 47-28 24 0 40 9 48 26-27-8-63-9-95 2Z"
            fill="#FFC778"
          />
          <g stroke="#FFF4D7" strokeWidth="3.5" strokeLinecap="round">
            <path d="m51 39 4-2m18-3 1 3m18-4 4 2m15 10 3-1m-50 7 3 1m22-7 4-1" />
          </g>
          {type === "fish" && (
            <path
              d="m41 90 5 3m13-4 5 3m42-2 6 3"
              stroke="#F6D599"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}
        </g>
      ) : type === "fries" ? (
        <g>
          <g stroke="#F4BC45" strokeWidth="12" strokeLinecap="round">
            <path d="m47 77-4-46m16 45V24m16 54-2-58m17 61 4-49m11 50 11-54" />
          </g>
          <path
            d="m35 64 12 51c18 10 47 10 65 0l13-51c-26 11-65 11-90 0Z"
            fill="#DB5140"
          />
          <path
            d="M66 89c9 6 17 6 27 0"
            stroke="#FFD473"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      ) : type === "nuggets" ? (
        <g fill="#DCA052" stroke="#C68639" strokeWidth="3">
          <rect
            x="28"
            y="75"
            width="52"
            height="31"
            rx="13"
            transform="rotate(-15 28 75)"
          />
          <rect
            x="82"
            y="75"
            width="48"
            height="31"
            rx="13"
            transform="rotate(13 82 75)"
          />
          <rect
            x="57"
            y="42"
            width="50"
            height="32"
            rx="13"
            transform="rotate(10 57 42)"
          />
        </g>
      ) : (
        <g>
          <path
            d="m57 37 9 81h34l9-81Z"
            fill={type === "coffee" ? "#E2C29A" : "#E65443"}
          />
          <path
            d="m70 35-5-21h-9"
            stroke="#A1AD88"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <rect
            x="52"
            y="32"
            width="62"
            height="10"
            rx="5"
            fill="#FFFAED"
            stroke="#DEDDCE"
            strokeWidth="2"
          />
          <path
            d="M73 72c7 7 13 7 21 0"
            stroke="#FFF2D1"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="75" cy="62" r="2" fill="#FFF2D1" />
          <circle cx="93" cy="62" r="2" fill="#FFF2D1" />
        </g>
      )}
    </svg>
  );
}
export function BrandMark({ small = false }) {
  return (
    <span className={`brand-mark ${small ? "small" : ""}`}>
      <svg
        width="31"
        height="31"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <path d="M7 23C7 14 12 9 20 9s13 5 13 14H7Z" fill="#FFD46E" />
        <path
          d="M8 29h24"
          stroke="#FFF7DE"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="m15 17 1-1m8-1 1 1"
          stroke="#FFF7DE"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

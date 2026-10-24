// English wording for the public pages, from .scratch/thai-english/copy-public.md.

import { event, eventDateRangeLabel, eventVenue } from "@/lib/event";
import type { Dictionary } from ".";

const dateRange = eventDateRangeLabel("en");
const venue = eventVenue("en");

export const en: Dictionary = {
  languageToggleName: "Choose language",
  skipLink: "Skip to main content",
  homeLinkName: "STEM Racing Thailand home",
  contactListName: "Contact the organisers",
  registrationPage: {
    title: `Register to attend ${event.name}`,
    description: `Register to attend ${event.name}, ${dateRange}, at ${venue}.`,
    bannerAlt: `${event.name} National Finals — Grand Richmond`,
    heading: `Register to attend ${event.name}`,
    introduction: `Come and feel the atmosphere of ${event.name} and cheer on the young competitors.`,
    dateAndVenue: `${dateRange} · ${venue}`,
    loading: "Loading the registration form…",
  },
  registrationClosed: {
    heading: "Registration is closed",
    body: `Registration for ${event.name} has closed. Thank you for your interest.`,
    questions: "If you have any questions, please contact the organisers.",
  },
  eventPassNotFound: {
    heading: "Event Pass not found",
    body: "The link may be wrong or incomplete. Please check it, or contact the organisers.",
    action: "Go to the registration form",
  },
  pageNotFound: {
    title: "Page not found",
    heading: "Page not found",
    body: "The link may be wrong. Please check it.",
    action: "Go to the registration form",
  },
};

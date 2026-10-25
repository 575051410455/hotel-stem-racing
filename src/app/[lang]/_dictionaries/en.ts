// English wording for the public pages, from .scratch/thai-english/copy-public.md.

import { event, eventDateRangeLabel, eventVenue } from "@/lib/event";
import { SUBMISSION_WINDOW_MINUTES } from "@/lib/registrations/bot-protection";
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
  registrationForm: {
    formName: "Registration form",
    intro: "Please fill in your details to register.",
    requiredKey: "marks a required field",
    requiredForScreenReaders: "(required)",
    givenName: "Given name",
    familyName: "Family name",
    phone: "Phone number",
    phoneHint: "A Thai mobile or landline, or an international number starting with + and the country code",
    phonePlaceholder: "081-234-5678",
    email: "Email",
    emailPlaceholder: "name@example.com",
    roleQuestion: "You're attending as",
    chooseOne: "(choose one)",
    chooseOneOrMore: "(choose one or more)",
    roleOther: "Please specify how you're attending",
    organisationHintSponsor: "Please give the company or organisation you represent",
    organisationHintOthers: "Leave blank if none",
    eventDaysQuestion: "Which days will you attend?",
    referralQuestion: "How did you hear about the Event?",
    referralOther: "Please specify where you heard about it",
    competingTeamCheeredFor: "Team you're coming to cheer for (optional)",
    comments: "Questions or suggestions",
    pdpaHeading: "Acknowledgment of the Personal Data Protection Policy (PDPA)",
    pdpaIntroduction:
      "Grand Richmond Hotel, as the organizer of STEM Racing Thailand National Finals 2026, is committed to protecting the personal data of all registrants in accordance with the Personal Data Protection Act B.E. 2562 (2019) (PDPA).",
    pdpaPurposes:
      "The information provided through this registration form, including your full name, telephone number, email address, and other relevant details, will be collected and used for registration purposes, attendance confirmation, event coordination, communication of event-related information, and event management. All personal data will be processed in accordance with the stated purposes and appropriate data protection measures.",
    pdpaMoreBefore:
      "Registrants may find further information regarding the use of personal data, data retention periods, and their rights as data subjects in the",
    pdpaPolicyLink: "Organizer’s Privacy Policy",
    pdpaMoreAfter: ".",
    pdpaAcknowledgment:
      "I acknowledge that I have read and understood the Personal Data Protection Policy (PDPA), including the purposes of the collection, use, and disclosure of my personal data as outlined above.",
    submit: "Register",
    submitting: "Registering…",
    onePerForm: "One person per form, please.",
  },
  botProtection: {
    loadFailed: "The security check didn't load. Check your internet connection, then reload this page.",
    error: "The security check ran into a problem.",
    unsupported: "This browser doesn't support the security check. Please update it or use another browser.",
    didNotPass: "The security check didn't pass. Wait for the check above to finish, then press Register again.",
    rateLimited: `Too many forms have been sent from this network. Please wait about ${SUBMISSION_WINDOW_MINUTES} minutes and try again.`,
    retry: "Try again",
  },
  duplicateRegistration: {
    heading: "You're already registered",
    resent: "We've sent your Event Pass to {email} again.",
    spamHint: "If it isn't in your inbox, check your spam folder.",
    checkInbox: "Look for your Event Pass in the inbox of the email you registered with ({email}), including the spam folder.",
    registeredWith: "You registered with {email}.",
    stillNotFound: "If you still can't find it, please contact the organisers.",
    wantItAgain: "To get your Event Pass again, please contact the organisers.",
    registerSomeoneElse: "Register someone else",
  },
  registrationClosed: {
    heading: "Registration is closed",
    body: `Registration for ${event.name} has closed. Thank you for your interest.`,
    questions: "If you have any questions, please contact the organisers.",
  },
  eventPassPage: {
    title: `Event Pass · ${event.name}`,
    thankYou: `Thank you for registering for ${event.name} 🏁`,
    seeYou: `See you on the day you chose, at ${venue}.`,
    saveThis: "Please save this page or take a screenshot, so you can show the QR at the entrance.",
    loading: "Loading your Event Pass…",
  },
  eventPassCard: {
    title: `Event Pass · ${event.name}`,
    dateAndVenue: `${dateRange} · ${venue}`,
    venue,
    qrName: "Event Pass QR, Pass Code {passCode}",
    passCodeLabel: "Pass Code",
    passCodeHint: "If the QR won't scan, give this code",
    nameLabel: "Name",
    daysLabel: "Event Days",
    saveButton: "Save Event Pass",
    saving: "Creating the file…",
    fileHint: "An image file, {file}, to keep on your device or print",
    downloadStarted: "Downloading {file}",
    preview: "Press and hold the image below to save it",
    saveFailed: "Couldn't save the file. Please take a screenshot of this page instead.",
    imageAlt: "Event Pass, Pass Code {passCode}",
  },
  eventPassNotFound: {
    heading: "Event Pass not found",
    body: "The link may be wrong or incomplete. Please check it, or contact the organisers.",
    action: "Go to the registration form",
  },
  pageNotFound: {
    heading: "Page not found",
    body: "The link may be wrong or incomplete. If it's an Event Pass link, check the one in your email again, or contact the organisers.",
    action: "Go to the registration form",
  },
};

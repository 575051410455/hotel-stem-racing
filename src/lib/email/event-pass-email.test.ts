import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { EventPassMessage } from "@/lib/registrations/ports";
import { buildEventPassEmail } from "./event-pass-email";

const passLink = "https://register.example.org/p/6f1c2a4e-8b3d-4c5e-9f7a-1b2c3d4e5f60";

function message(pass: Partial<EventPassMessage["pass"]> = {}): EventPassMessage {
  return {
    to: "somchai@example.com",
    passLink,
    pass: {
      token: "6f1c2a4e-8b3d-4c5e-9f7a-1b2c3d4e5f60",
      passCode: "EP-ABCD2345",
      givenName: "สมชาย",
      familyName: "ใจดี",
      eventDays: ["2026-10-31", "2026-11-01"],
      ...pass,
    },
  };
}

describe("Event Pass email", () => {
  test("HTML-escapes the Attendee's name", async () => {
    const email = await buildEventPassEmail(
      message({ givenName: '<script>alert("x")</script>', familyName: "Tom & Jerry" }),
    );

    assert.ok(!email.html.includes("<script>"), "raw <script> must not reach the HTML");
    assert.ok(email.html.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"));
    assert.ok(email.html.includes("Tom &amp; Jerry"));
    assert.ok(!email.html.includes("Tom & Jerry"));
  });

  test("includes a plain-text part with the Pass Code and the raw link", async () => {
    const email = await buildEventPassEmail(message());

    assert.ok(email.text.includes("EP-ABCD2345"));
    assert.ok(email.text.includes(passLink));
  });

  test("shows the Pass Code, a button to the Event Pass and the raw link in the HTML", async () => {
    const email = await buildEventPassEmail(message());

    assert.ok(email.html.includes(">EP-ABCD2345<"), "Pass Code shown as text");
    assert.ok(email.html.includes(`href="${passLink}"`), "links to the Event Pass");
    assert.ok(email.html.includes(`>${passLink}</a>`), "raw link shown for when the button fails");
  });

  test("attaches the QR and the banner as inline images the HTML points to", async () => {
    const banner = Buffer.from("banner jpeg bytes");
    const email = await buildEventPassEmail(message(), { banner });

    const qr = email.attachments.find((attachment) => attachment.contentType === "image/png");
    const header = email.attachments.find((attachment) => attachment.contentType === "image/jpeg");
    assert.ok(qr, "QR attachment");
    assert.ok(header, "banner attachment");

    assert.deepEqual(qr.content.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    assert.equal(qr.filename, "EP-ABCD2345.png", "named after the Pass Code, never the token");
    assert.equal(header.content, banner);
    for (const attachment of [qr, header]) {
      assert.equal(attachment.contentDisposition, "inline");
      assert.ok(email.html.includes(`src="cid:${attachment.cid}"`), `HTML shows ${attachment.cid}`);
    }
  });

  describe("in a process far from Bangkok", () => {
    const processTimeZone = process.env.TZ;

    // Honolulu is 17 hours behind Bangkok, so any date not pinned to Asia/Bangkok lands a day early.
    before(() => {
      process.env.TZ = "Pacific/Honolulu";
    });

    after(() => {
      if (processTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = processTimeZone;
    });

    test("formats a single Event Day in Bangkok time", async () => {
      const email = await buildEventPassEmail(message({ eventDays: ["2026-11-01"] }));

      for (const part of [email.html, email.text]) {
        assert.ok(part.includes("วันอาทิตย์ที่ 1 พฤศจิกายน 2569"), "Thai date");
        assert.ok(part.includes("Sunday, 1 November 2026"), "English date");
      }
    });

    test("formats both Event Days as one range in Bangkok time", async () => {
      const email = await buildEventPassEmail(message({ eventDays: ["2026-11-01", "2026-10-31"] }));

      for (const part of [email.html, email.text]) {
        assert.ok(part.includes("วันเสาร์ที่ 31 ตุลาคม – วันอาทิตย์ที่ 1 พฤศจิกายน 2569"), "Thai range");
        assert.ok(part.includes("Saturday 31 October – Sunday 1 November 2026"), "English range");
      }
    });

    test("adds opening hours in Bangkok time once they are configured", async () => {
      const email = await buildEventPassEmail(message({ eventDays: ["2026-10-31"] }), {
        openingHours: { opens: "09:00", closes: "17:30" },
      });

      for (const part of [email.html, email.text]) {
        assert.ok(part.includes("วันเสาร์ที่ 31 ตุลาคม 2569 เวลา 09:00–17:30 น."), "Thai time range");
        assert.ok(part.includes("Saturday, 31 October 2026, 09:00–17:30"), "English time range");
      }
    });
  });
});

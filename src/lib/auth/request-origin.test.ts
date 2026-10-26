import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isSameOriginRequest } from "./request-origin";

const baseURL = "https://register.example.org";

describe("The origin of Back Office mutations", () => {
  test("missing Fetch Metadata does not trust a sibling-origin form or a request with no origin evidence", () => {
    assert.equal(isSameOriginRequest(new Headers({ origin: "https://other.example.org" }), baseURL), false);
    assert.equal(isSameOriginRequest(new Headers(), baseURL), false);
  });

  test("same-origin browser requests work with Fetch Metadata, an Origin fallback and effective default ports", () => {
    for (const headers of [
      new Headers({ "sec-fetch-site": "same-origin" }),
      new Headers({ origin: baseURL }),
      new Headers({ "sec-fetch-site": "same-origin", origin: baseURL }),
      new Headers({ origin: "https://register.example.org:443" }),
    ]) {
      assert.equal(isSameOriginRequest(headers, `${baseURL}/auth`), true);
    }
    assert.equal(isSameOriginRequest(new Headers({ origin: "http://localhost:3000" }), "http://localhost:3000"), true);
    assert.equal(isSameOriginRequest(new Headers({ origin: "http://[::1]:3000" }), "http://[::1]:3000"), true);
  });

  test("a full URL, opaque origin or combined header is not a browser Origin", () => {
    for (const origin of [
      "",
      "null",
      "not a URL",
      `${baseURL}/`,
      `${baseURL}/path`,
      `${baseURL}/..`,
      `${baseURL}?q=1`,
      `${baseURL}#fragment`,
      "https://name:password@register.example.org",
      "https://register.example.org:",
      "https://register.example.org:65536",
      "https://register.example.org\\path",
      "https://%72egister.example.org",
      `blob:${baseURL}/token`,
      `${baseURL}, https://other.example.org`,
      `${baseURL} https://other.example.org`,
    ]) {
      assert.equal(isSameOriginRequest(new Headers({ "sec-fetch-site": "same-origin", origin }), baseURL), false, origin);
    }
  });

  test("invalid trusted configuration is an explicit error, even for otherwise trusted headers", () => {
    for (const configured of [
      undefined,
      "",
      "not a URL",
      "file:///tmp/back-office",
      "ftp://register.example.org",
      "data:text/plain,hello",
      "https://name:password@register.example.org",
      "https:register.example.org",
      "https://register.example.org\\path",
    ]) {
      assert.throws(
        () => isSameOriginRequest(new Headers({ "sec-fetch-site": "same-origin" }), configured),
        /BETTER_AUTH_URL/,
      );
    }
  });

  test("untrusted Fetch Metadata cannot be overridden by a matching Origin", () => {
    for (const site of ["", "same-site", "cross-site", "none", "unknown", "same-origin, same-origin"]) {
      assert.equal(isSameOriginRequest(new Headers({ "sec-fetch-site": site, origin: baseURL }), baseURL), false, site);
    }
  });

  test("conflicting origins, schemes, ports and deceptive hostnames are refused", () => {
    for (const origin of [
      "https://other.example.org",
      "http://register.example.org",
      "https://register.example.org:8443",
      "https://register.example.org.attacker.test",
      "https://attacker-register.example.org",
    ]) {
      for (const headers of [new Headers({ origin }), new Headers({ "sec-fetch-site": "same-origin", origin })]) {
        assert.equal(isSameOriginRequest(headers, baseURL), false, origin);
      }
    }
  });

  test("duplicate Origin headers do not become a trusted single origin", () => {
    const headers = new Headers({ "sec-fetch-site": "same-origin", origin: baseURL });
    headers.append("origin", baseURL);
    assert.equal(isSameOriginRequest(headers, baseURL), false);
  });
});

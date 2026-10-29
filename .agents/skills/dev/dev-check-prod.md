---
name: dev-check-prod
description: "ตรวจผลกระทบก่อน push/deploy และหลักฐานหลัง deploy ของ hotel-stem-racing: Registration, Event Pass เดิม, สิทธิ์ Admin/Staff/Kiosk และ Check-In พร้อมจัดประเภททุกไฟล์และระบุสิ่งที่ยังพิสูจน์ไม่ได้"
---

# Production-impact review: hotel-stem-racing

ตอบด้วยหลักฐานว่า release นี้รักษา Registration, Event Pass ที่แจกไปแล้ว และการทำงานที่ทางเข้างานได้หรือไม่ แยก **พฤติกรรมที่เปลี่ยนตาม spec**, **regression** และ **สิ่งที่ยังไม่ได้ตรวจ** อย่ารับรองว่า deploy “ไม่มีผลกระทบ” เพียงเพราะ tests ผ่าน

## ขอบเขตการทำงาน

- การเรียก checklist นี้อนุญาตให้ตรวจ source/config, รัน local checks และรายงาน ไม่ใช่คำสั่งให้แก้โค้ด, commit, push หรือ deploy การแก้ไขต้องมาจากคำขอของผู้ใช้แยกต่างหาก
- อนุญาต artifacts ของ typecheck/build และการเขียนใน **ฐานข้อมูลทดสอบชั่วคราวที่ยืนยันว่าแยกจากข้อมูลจริง** ตามหัวข้อ gates ไม่ต้องขออนุญาตซ้ำสำหรับการทดสอบที่อยู่ในขอบเขตนี้
- การเรียก checklist เพียงอย่างเดียวให้เก็บ application database ทั้ง dev/shared/remote/production เป็น read-only ไม่อนุญาต migrate, seed, Staff management, ส่งอีเมลจริง หรือเปลี่ยนข้อมูล/credentials หากผู้ใช้สั่งการทดสอบที่เขียนข้อมูลเพิ่มเติมไว้แล้ว ให้ใช้ขอบเขตและ authorization นั้นโดยไม่ถามซ้ำ SQL สำหรับ operator ให้เป็น read-only และระบุว่ายังไม่ได้รันถ้าไม่มีผลลัพธ์
- ปกปิดข้อมูลในหลักฐาน ห้ามแสดง `.env`, secret, session cookie, Event Pass token, dump หรือข้อมูลส่วนบุคคลจริง ตรวจ key names/สถานะการตั้งค่าได้โดยไม่พิมพ์ค่า อย่าแปะ raw diff ของ environment files หากมี credential

## 1. ระบุ revision และสิ่งที่จะถูกปล่อย

อ่าน `AGENTS.md`, `GLOSSARY.md`, spec/ticket ของการเปลี่ยนแปลง และ ADR ที่เกี่ยวข้อง โดยเฉพาะ ADR 0003–0006 ใช้ `docs/deploy.md` และ `docs/deploy-guide/index.html` เป็นขั้นตอน operator; ใช้ source/config ปัจจุบันตรวจว่าข้อความเหล่านั้นยังตรงกัน

```sh
git status -sb
git rev-parse HEAD
git log -5 --oneline
git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}'
```

บันทึกสามสถานะแยกกัน:

1. **Production baseline:** SHA ของ source ที่ใช้ build image ซึ่งกำลังรันจริง พร้อมหลักฐานจาก operator/deployment record `git rev-parse HEAD` บน server พิสูจน์ได้แค่ checkout; ถามด้วยว่า rebuild หลัง checkout นั้นหรือไม่ ถ้า mapping checkout → image ไม่ชัด ให้ระบุว่ายังยืนยัน running revision ไม่ได้
2. **Candidate:** full SHA ที่จะ push/deploy ถ้าตรวจ working tree ด้วย ให้ระบุ tracked/untracked changes แยกจาก committed candidate เพราะ CI ของ SHA ไม่ครอบคลุมไฟล์ที่ยังไม่ commit
3. **Remote/CI:** ตรวจ remote ล่าสุดด้วย GitHub connector หรือ `git ls-remote` อย่าใช้ cached `origin/main` เป็นหลักฐานว่า remote ปัจจุบันตรงกัน การตรวจนี้ไม่ต้อง push

สำหรับ post-deploy review ให้ baseline เป็น revision ก่อน rollout และ candidate เป็น revision ที่ deploy แล้ว บันทึกเวลา rollout และหลักฐาน image ที่รันหลัง rollout แยกจาก pre-deploy prediction

เมื่อรู้ baseline และ candidate แล้ว ตั้ง `BASE_SHA` / `TARGET_SHA` เป็น SHA ที่ตรวจแล้ว และใช้ direct diff ของสอง revision:

```sh
git log --oneline "$BASE_SHA..$TARGET_SHA"
git diff --name-status --find-renames "$BASE_SHA" "$TARGET_SHA"
git diff --stat "$BASE_SHA" "$TARGET_SHA"
git diff --check "$BASE_SHA" "$TARGET_SHA"
```

ถ้ายังไม่รู้ production SHA ให้ตรวจเทียบ remote หรือ baseline ที่ระบุได้ต่อได้ แต่ติดป้าย **provisional** และให้ production verdict เป็น `BLOCKED` จนยืนยัน baseline อย่าสมมติว่า remote HEAD คือ image ที่รันจริง

### Coverage ของไฟล์

- เปิด diff ของทุกไฟล์ รวม tests, docs, scripts, lockfile, config และ migrations; binary ให้ตรวจบทบาท/จุดใช้งาน ตรวจ rename ทั้งทางเดิมและใหม่ และผลของการลบไฟล์
- ทำบัญชี candidate กับ workspace แยกกัน นับ path ที่ซ้ำเพียงครั้งเดียวในยอดรวม ระบุว่าไฟล์ใดอยู่ใน release จริง
- รายงาน `จัดประเภทแล้ว N / ทั้งหมด N ไฟล์ (100%)` พร้อมตารางครบทุกไฟล์: path, กลุ่ม, อยู่ใน release หรือไม่, ผลกระทบและเหตุผล
- นี่คือ **file-review coverage** ไม่ใช่ test coverage ถ้าอ่าน/จัดประเภทไม่ครบ ให้ `BLOCKED` และระบุไฟล์ที่ขาด

## 2. ตรวจสัญญาที่ต้องรักษา

โปรเจกต์นี้เป็นการลงทะเบียน Attendee โดยไม่ต้องมี Account ไม่มีการชำระเงินหรือ My Tickets ใช้คำว่า **Registration**, **Event Pass**, **Pass Code**, **Check-In**, **Event Day** ตาม `GLOSSARY.md`

| เส้นทาง | ไฟล์ที่ต้องตามเมื่อเกี่ยวข้อง | สิ่งที่ต้องพิสูจน์ |
|---|---|---|
| Registration/ข้อมูลเดิม | `src/lib/registrations/`, `src/lib/server/registrations.ts`, `src/app/[lang]/`, `src/lib/bot-check/` | Validation, Duplicate Registration, PDPA, วันเปิดรับ/เวลา Bangkok; ข้อมูลเก่าที่มี nullable fields; Turnstile และ trusted visitor IP |
| Event Pass เดิม | `src/lib/registrations/event-pass-codec.ts`, `src/proxy.ts`, `src/app/[lang]/p/`, `src/lib/email/` | UUID token และ Pass Code เดิม resolve ได้; public page สองภาษา/ดาวน์โหลด/อีเมลทำงาน; unknown pass เป็น 404 |
| Accounts/Back Office | `src/lib/auth/`, `src/lib/db/auth-schema.ts`, `src/app/admin/`, `src/app/api/` | Sessions, disabled/must-change-password, สิทธิ์ Admin/Staff/Kiosk ฝั่ง server; origin guard ไม่ทำให้คำขอปกติเสีย |
| Desk/Kiosk | `src/lib/registrations/check-in.ts`, `src/lib/check-in/`, `src/app/admin/(back-office)/check-in/`, `src/app/kiosk/` | Check-In ถูกคน ถูก Event Day ไม่ซ้ำ; กล้อง/session/retry ทำงานทั้งสอง flow |
| Runtime/deploy | `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `next.config.ts`, `deploy/nginx/templates/`, `scripts/migrate.mjs`, `drizzle/`, `.github/workflows/ci.yml`, package files | Image มีไฟล์/dependencies ครบ; migration, ingress, volume และ env ถูกต้อง |

ตารางนี้เป็นจุดเริ่มต้น ให้ตาม import/caller ของไฟล์ที่เปลี่ยนด้วย ไม่ใช่ allowlist ที่ทำให้ข้ามไฟล์อื่นได้

### Event Pass

- Token เป็น UUID ใน `registrations.token`; Pass Code อยู่ใน `registrations.pass_code` ทั้งคู่มี unique constraint ไม่ใช่ HMAC ที่ผูกกับ auth secret ตรวจว่า release ไม่เขียนทับ/regenerate ค่าของ Registration เดิม
- QR เป็นลิงก์ `/p/{token}`; codec รับ bare token, Pass Code ที่ normalize แล้ว และลิงก์ที่อ่านสอง path segments สุดท้ายโดยไม่ใช้ host ต้องรักษาการสแกนลิงก์เก่า
- การสแกนโดยไม่สน host **ไม่ได้พิสูจน์ว่ากดลิงก์โดเมนเก่าในอีเมลแล้วเปิดหน้าได้** ถ้าเปลี่ยนโดเมน ให้ตรวจ DNS/redirect ของลิงก์ที่แจกไปแล้วแยกกัน
- Schema/codec diff ว่างเป็นหลักฐานจำกัดเฉพาะไฟล์นั้น ยังต้องตรวจ callers, query filters, Proxy, language routing และ runtime config ที่เปลี่ยน

### Accounts, Check-In และกล้อง

- Admin ใช้ Back Office; Staff ใช้ desk และ My Account; Kiosk Account ถูกจำกัดที่ Kiosk ตาม `access.ts` และ ADR ล่าสุด Proxy ตรวจแค่ cookie presence ไม่ใช่หลักฐาน authorization ให้ตรวจ page, Route Handler และ Server Action ด้วย
- ตาม ADR 0006: Staff desk สแกน/Enter → read-only preview → **Confirm Check-In** จึงบันทึก; Cancel ไม่บันทึก ลิงก์เก่า `?kiosk=1` เปิด desk นี้ ให้เทียบกับ baseline เพื่อบอกผลที่ Staff จะพบหลัง rollout
- Separate `/kiosk` ยังคงบันทึกทันที Kiosk Account ใช้ Event Day ปัจจุบันจาก server เท่านั้น วันที่ client ส่งมาต้องไม่เปลี่ยนวันบันทึก
- หนึ่ง Check-In ต่อ Registration ต่อ Event Day ต้องยังมี unique constraint ที่ฐานข้อมูล Repeat/concurrent/retry หลัง response หายต้องได้ผลเดิม ไม่เพิ่มรายการซ้ำ; confirmation recheck pass/session/day ไม่เชื่อ preview เก่า
- Attendee ที่ไม่ได้เลือก Event Day นั้นยังเข้าได้โดยมี warning และ flag; วันที่ Staff review ต้องคงเดิมตลอด confirm/retry ตรวจ deleted pass, disabled/expired session และ input locking ด้วย
- Shared `CameraScanner` ต้องไม่ทำให้ Kiosk ต้องกด Confirm ตรวจ serialized start/stop/switch, permissions/retry, continuous scan, held QR, removal/re-presentation, next different QR และ manual keyboard
- ถ้าแตะ scanner/desk layout ให้ตรวจ acceptance ใน `.scratch/check-in-ui-redesign/verification.md` และ tickets การจำลอง viewport/video ไม่แทน real-iPad/Safari/VoiceOver; threshold 1.2 วินาทีของ Staff QR rearm ต้องตรวจบนเครื่องจริงเมื่อเกี่ยวข้อง

## 3. Database, image และ environment

### Migration กับข้อมูลเดิม

อ่าน diff ทั้ง `src/lib/db/schema.ts`, `src/lib/db/auth-schema.ts`, `drizzle/` และ `scripts/migrate.mjs` เทียบตั้งแต่ production baseline

- Container เรียก `node scripts/migrate.mjs` ก่อน `server.js` และหยุดถ้า migrate ล้มเหลว ใช้ committed SQL migrations กับ Drizzle journal ไม่ใช้ schema push ตอน startup
- **Schema diff ว่างไม่ได้แปลว่า migration เป็น no-op** ตรวจ production migration journal กับ SQL files/ลำดับ/hash ที่จะ ship; จำนวนแถวอย่างเดียวไม่พอ ห้ามถือว่าการ migrate ฐานข้อมูลของ checkout ในเครื่องอัปเดต Compose DB แล้ว
- ถ้ามี migration ค้าง ให้รวมทั้งหมดในการประเมิน แม้ commit ก่อนช่วง diff ตรวจ additive changes, defaults/nullability, backfill, locks และ compatibility กับ app เก่า/ข้อมูลเดิม การเพิ่มคอลัมน์อาจมี lock หรือ backfill จึงไม่ปลอดภัยอัตโนมัติ
- Migration ที่ commit แล้วต้องไม่ถูกแก้ทับ การ drop/rename/type change หรือทำลาย constraint ต้องมีแผนรักษาข้อมูล, backup/recovery และหลักฐานทดสอบก่อนผ่าน ให้ `UNSAFE` เมื่อมีเส้นทางสูญข้อมูลหรือ regression ที่ยืนยันแล้ว
- สำหรับเงื่อนไขข้อมูลจริง ให้เสนอ read-only SQL ที่ตรงกับ query ใหม่ แสดงเฉพาะ aggregate/metadata ที่จำเป็น และให้ operator รันเมื่อยังไม่มี access ห้ามเดาว่าข้อมูล production ตรงกับ fixture

ตัวอย่าง metadata ที่ให้ operator ตรวจได้ (อาจไม่มี journal หากไม่เคย migrate):

```sql
SELECT to_regclass('drizzle.__drizzle_migrations') AS migration_journal;
-- รันเมื่อมี journal แล้ว; เทียบกับ migration files ของ candidate ต่อ
SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id;
```

### Packaging และ configuration

- Docker ใช้ standalone output แล้ว copy production `node_modules`, `public/`, `src/`, `scripts/`, `drizzle/` เพิ่มเอง ตรวจ Dockerfile ปัจจุบัน อย่าตัดสินว่า runtime asset หายเพียงเพราะไม่มี `outputFileTracingIncludes`
- ถ้า diff เพิ่ม file read/dynamic import ให้ตามจนถึงไฟล์/dependency ที่ copy เข้า image จริง เช่น email banner ใน `public/brand/` และ SMTP dependency; browser-only scanner import ต้องไม่ถูกเรียกตอน prerender
- อ่าน Node image/เวอร์ชันจาก Dockerfile และ CI อย่าบังคับ npm 10 ตาม checklist เก่า `npm ci --dry-run` ในเครื่องเป็นข้อมูลเสริม ไม่แทน image build
- Compose override `DATABASE_URL` ไป service `db` และใช้ named volume; ตรวจว่า project/volume/database identity ไม่เปลี่ยน `.env` ของ dev ไม่ใช่หลักฐานว่า container ใช้ DB เดียวกัน
- รักษา `BETTER_AUTH_SECRET` สำหรับ sessions และ `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` สำหรับ builds/actions ตามแผน release การเปลี่ยน key ไม่ใช่ routine check และไม่ได้ invalidate Event Pass UUID; แม้ key คงเดิมก็ให้ reload desk/Kiosk หลัง rollout
- ตรวจ `APP_URL`, `BETTER_AUTH_URL` ให้ตรง public origin โดยเฉพาะ mutation guard ใน `request-origin.ts`; `NEXT_PUBLIC_*` ถูกฝังตอน build, SMTP/Turnstile server settings ใช้ตอน runtime ห้ามเอา production secrets ใส่ `.env.example` หรือหลักฐาน
- อ่าน `.dockerignore` ก่อนสรุปว่า docs/skill เข้า image หรือไม่ แต่ deploy docs/CI config ยังมีผลต่อ operator/release ตรวจ nginx/Cloudflare Tunnel และ forwarding ของ visitor IP เมื่อเกี่ยวข้อง
- เมื่อ release แก้ Next.js ให้ตรวจ local `node_modules/next/dist/docs/`: Cache Components, request-time data ใต้ Suspense/หลัง `connection()` และไม่มี `runtime` export ตาม `AGENTS.md`

## 4. รัน gates โดยแยกฐานข้อมูลทดสอบจากข้อมูลจริง

สำหรับ release ที่เปลี่ยน application/runtime/dependencies ให้รัน gates จาก `package.json` ตาม `AGENTS.md` ก่อน `npm test` อ่าน runner, tests และ `src/test-support/database.ts` ปัจจุบัน ยืนยันว่าใช้ PostgreSQL 17 สำหรับทดสอบที่แยกจาก application data และไม่มี forwarding ไปฐานข้อมูลจริง แล้ว pin `TEST_DATABASE_ADMIN_URL` ให้ชัด ตัวอย่างสำหรับ Homebrew Postgres ในเครื่องตาม `AGENTS.md` หลังยืนยัน isolation แล้ว:

```sh
npm run typecheck
npm run lint
TEST_DATABASE_ADMIN_URL='postgres://localhost:5432/postgres' npm test
npm run build
```

`typecheck` มี `next typegen` อยู่แล้ว อย่าแทนด้วย `tsc` อย่างเดียว และอย่ารัน typegen/build พร้อมกันใน checkout เดียวเพราะเขียน `.next` ร่วมกัน

ผูกผล gates กับ source ที่รันจริง: ใช้ checkout แยกที่ตรง candidate หรือระบุ working-tree changes ที่ร่วมในการรัน ห้ามอ้างว่าผลจาก dirty tree เป็นผลของ committed SHA โดยไม่ตรวจความต่างและผลต่อ checks

- Helper สร้างฐานข้อมูล `stem_test_<random>` ใหม่ต่อ test file, migrate ลงฐานนั้น, `reset()` ก่อนแต่ละ test และ drop ฐานชั่วคราวเมื่อเสร็จ **การเขียนเหล่านี้อนุญาต** ตรวจว่าไม่มี test เปลี่ยนไปใช้ application `DATABASE_URL` หรือ credentials จริง อย่าโหลด `.env` เพื่อเลือก test DB
- ถ้ายืนยัน isolation ไม่ได้ ให้ข้ามเฉพาะ DB-dependent checks, รัน pure tests ที่เกี่ยวข้อง และบันทึก full suite ว่า **NOT RUN** พร้อมเหตุผล/สิ่งที่ต้องใช้ ห้ามเปลี่ยนไป mock DB เพื่อทำให้ gate ผ่าน
- ใช้ real-database tests ที่ seam Registration/Accounts และ pure seams ที่ตกลงใน spec ตาม `AGENTS.md` ตรวจ observable outcomes โดยเฉพาะ concurrency, duplicate/retry และข้อมูลเก่า ไม่อ้างว่า typecheck พิสูจน์ SQL runtime
- Browser checks เพิ่มได้ใน local isolated environment ที่ใช้ synthetic data และ fake เฉพาะ boundaries ที่อนุญาต ปิดการส่ง SMTP จริง; ถ้ายังตั้งค่าไม่ได้ ให้รายงานข้อจำกัด
- Docs/skill-only changes ให้ตรวจเอกสาร/links/คำสั่งตามความเกี่ยวข้อง ไม่ต้องรัน application suite เพียงเพราะเรียก checklist แต่ก่อน commit ต้องทำตาม gates ที่ `AGENTS.md` กำหนด

ตรวจ CI ของ **full candidate SHA** ทั้ง gates job และ Docker image/Compose/nginx job ใช้ API ที่รวม push-triggered runs; GitHub helper บางตัวกรองเฉพาะ PR runs จึงใช้ผลว่างจาก helper นั้นยืนยันว่าไม่มี CI ไม่ได้ ถ้าไม่มี Docker ในเครื่อง ใช้ผล image job ของ SHA เดียวกันและระบุว่าไม่ได้ build ในเครื่อง

ก่อน push อาจยังไม่มี CI ของ candidate ให้รายงาน source/local checks ได้พร้อมสถานะ `DEPLOY: BLOCKED — รอ CI หลัง push` การขาด CI ก่อน push ไม่ใช่ข้อห้าม push และ checklist นี้ไม่ได้ push ให้เอง สำหรับ post-deploy review ให้ตรวจหลักฐานของ release ที่เกิดขึ้นจริง ไม่เรียกร้อง CI ใหม่เพียงเพราะกำลังตรวจหลัง rollout

เก็บ exit code, สรุป output, test counts/failures/skips และ revision ที่ตรวจ หลักฐานเก่าใน memory/verification เป็นประวัติ ไม่ใช่ผลรันใหม่ ทั้ง file coverage และ test coverage ไม่ใช่คำรับรองว่า runtime ทุกเส้นทางปลอดภัย

## 5. ก่อนและหลัง rollout

Checklist นี้ไม่ deploy ให้เอง เตรียมสิ่งที่ operator ต้องตรวจตาม `docs/deploy.md`:

- ก่อน deploy: candidate อยู่บน remote และ CI ของ SHA นั้นผ่าน, device acceptance ที่เกี่ยวข้องครบ, production migration/config preconditions ยืนยันแล้ว, backup ที่ตรวจว่าอ่านได้และสำเนานอก server อยู่ใน directory `0700`/file `0600`
- ตรวจวันงาน/ช่วงเปิดประตูและ freeze ตาม ADR/ticket ล่าสุด (ADR 0004 บันทึก 29 ต.ค.–1 พ.ย. 2026) การตรวจ checklist ไม่ยกเลิก freeze; ไม่ rollout ระหว่างกำลังรับ Attendee โดยไม่มีการตัดสินใจเรื่องช่วงหยุดบริการ
- Repo นี้ CI ไม่ deploy; operator pull แล้ว `docker compose up -d --build` การ rebuild/recreate อาจทำให้ requests/scans ล้มเหลวช่วงสั้น อย่ารับรอง zero downtime
- รักษา named database volume; `docker compose down -v` ลบข้อมูล ไม่ใช่ขั้นตอน rollout/recovery
- Rollback app ต้องตรวจ compatibility กับ schema ปัจจุบันก่อน การ restore dump สูญ Registration/Check-In หลัง backup ต้องเป็นการตัดสินใจของ operator ไม่ใช่สิ่งที่ checklist ทำอัตโนมัติ

หลัง deploy ให้ตรวจด้วยหลักฐานใหม่เมื่อผู้ใช้ขอ post-deploy review หรือมีผลจาก operator:

1. Revision/image ที่รันตรง candidate, `docker compose ps` healthy และ app logs ไม่มี startup/migration failure; redact logs ก่อนแสดง Healthcheck หน้า `/` อย่างเดียวไม่พิสูจน์ DB/auth/email/scanner
2. เปิด Event Pass ที่มีอยู่ก่อน deploy ทั้งไทย/อังกฤษ รวม QR/Pass Code และ unknown-pass 404 โดยไม่เผย token/ข้อมูล Attendee ในรายงาน
3. ตรวจ public Registration, validation/Turnstile และ email/download ด้วย synthetic data ใน staging เป็นหลัก การสร้าง Registration/ส่งอีเมลบน production ต้องมีคำขอที่อนุญาตการเขียนนั้นก่อน
4. Reload desks/Kiosks แล้วตรวจ sign-in และสิทธิ์ Admin/Staff/Kiosk, preview/Cancel, Confirm และ repeat/retry บนข้อมูลทดสอบที่ได้รับอนุญาต; sign-in สร้าง session และ Confirm เขียน Check-In จึงต้องอยู่ใน authorization ของการตรวจ production ด้วย แยก Staff desk จาก Kiosk และไม่ใช้ pass ของ Attendee จริงบันทึก arrival เพื่อทดสอบ
5. Kiosk ใช้วันปัจจุบัน: ถ้ายังไม่ใช่ Event Day ต้องได้ `not-an-event-day` ไม่เปลี่ยน production clock เพื่อทำให้ตรวจผ่าน การยืนยัน successful Kiosk Check-In ก่อนวันงานให้ทำใน isolated test/staging ด้วย injected clock

ถ้าไม่ได้เข้าถึง production ให้ระบุ **POST-DEPLOY: NOT VERIFIED** พร้อมรายการที่ operator ต้องส่งกลับ อย่าเขียนรายการที่วางแผนไว้เป็นผลทดสอบที่ผ่านแล้ว

## 6. รูปแบบรายงานและ verdict

เริ่มด้วย verdict, baseline/candidate และ coverage แล้วให้ผลต่อ 4 ด้าน: Registration/ข้อมูลเดิม, Event Pass เดิม, Accounts/Back Office, Staff desk/Kiosk แต่ละด้านระบุ intentional change, regression หรือยังพิสูจน์ไม่ได้ พร้อมคำสั่ง/output ที่ปกปิดข้อมูลแล้วและ file:line ที่รองรับ

| Verdict | ใช้เมื่อ |
|---|---|
| `SAFE` | ตรวจครบ ขอบเขต production ชัด และหลักฐานที่จำเป็นผ่าน ไม่พบ regression ในขอบเขตที่ตรวจ; ไม่ใช่คำรับรองความเสี่ยงเป็นศูนย์ |
| `SAFE WITH PRECONDITIONS` | ตรวจ technical compatibility ที่จำเป็นแล้ว เหลือเงื่อนไข operator ที่ชัดและตรวจได้ก่อน rollout เช่น backup/ช่วงเวลา ระบุเงื่อนไขและวิธียืนยันทั้งหมด |
| `UNSAFE` | พบ regression/การสูญข้อมูล/สิทธิ์หรือ compatibility ที่เสียจาก release พร้อมหลักฐาน |
| `BLOCKED` | Coverage ไม่ครบ, baseline ไม่ทราบ หรือขาดหลักฐานจำเป็น เช่น required tests, CI, migration state หรือ device acceptance ที่เกี่ยวข้อง |

ปิดรายงานด้วยตารางไฟล์ครบทุกไฟล์, blockers เรียงตามผลกระทบ, preconditions พร้อม read-only SQL ถ้าจำเป็น, gate results และสถานะ post-deploy ถ้า scope เป็น provisional ให้คง verdict ของ production เป็น `BLOCKED` แม้ local checks ผ่าน อย่าใช้จำนวนไฟล์/คะแนน coverage แทนหลักฐานความเข้ากันได้ของระบบจริง

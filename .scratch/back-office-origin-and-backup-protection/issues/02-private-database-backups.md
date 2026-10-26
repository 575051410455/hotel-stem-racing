# 02: Keep documented database backups private

**What to build:** An operator following either deployment guide can create manual or nightly backups with private directory and file permissions, restrict earlier dumps and keep off-server copies private.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Manual and nightly backup procedures set a scoped restrictive umask, ensure the backup directory is mode `0700` and produce mode `0600` dumps even with permissive ambient defaults or an existing output file.
- [x] A repair procedure restricts only intended existing regular dump files without following symbolic links or changing unrelated home-directory permissions.
- [x] The deployment command summary and full guide agree; cron escaping, quoted paths, database selection, naming, two-week retention and restore compatibility are preserved.
- [x] Off-server copy instructions include private destination permissions and explain how to check modes without displaying dump contents.
- [x] Command verification uses harmless content in a disposable directory and covers new files, existing permissive files and unrelated-file preservation; no real dump or production modification is required.

## Answer

Updated both operator guides with scoped restrictive permissions, symlink and output-type checks, existing-file repair, a private off-server copy destination and permission inspection. Existing output modes are restricted before redirection opens the dump.

Validation extracted the actual command blocks from the HTML, checked that the Markdown summary's manual command matches, and checked shell syntax. Synthetic execution under ambient umask `022` verified new and repeated output modes, repair of permissive existing modes, symlink and directory-output refusal, preservation of unrelated/nested files, nightly retention only after success, and private copied files. No real dump or production settings were used. Required project checks passed; standards, spec and bypass/regression reviews reported no findings.

An operator must apply the updated instructions and existing-dump repair on the deployment host; documentation changes do not alter live filesystem modes or cron entries.

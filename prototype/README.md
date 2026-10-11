# Hostel Ops

Responsive frontend prototype for a university hostel management platform. No build step or dependencies are required; use Node.js to serve it:

```sh
npm start
```

Open http://localhost:3000. Select **Login → Enter demo workspace**, then switch between Student, Warden, Admin and Mentor using **Preview role**.

Includes a public landing page, four dashboards, role-specific navigation, labeled forms, keyboard-accessible dialogs, responsive tables, mobile drawer, status badges, notifications, in-memory request/approval workflows and downloadable accommodation CSV.

Run `npm run check` for syntax validation and `node smoke-test.js` for rendering and state-transition checks.

## Prototype boundaries

- All records and aggregate counts are fictional. Changes reset on refresh.
- Role switching demonstrates layouts; it is not authentication or access control. No production student data should be added to the frontend source.
- Registration, administrative creation and contact forms preview information without sending it. Invitations, document verification, allocation validation, authentication, MFA, audit persistence and secure storage require backend implementation.
- QR passes and SOS explicitly indicate they are not live. No gate credentials or emergency alerts are generated.
- Guardians are emergency contacts only, never users. Mentor views exclude guardian contacts, gate records and complaint history.
- Google Fonts and Unsplash images require internet access; the font falls back to Arial.
- `server.js` is a local development server, not a production host.

Student registration includes academic and contact details plus a single preferred mess name. The review displays the preference; final mess allocation must be confirmed by the institution.


## Blue & slate interface and two pass types

- **Quick Pass:** Entry or Exit QR preview generated between 05:00 (inclusive) and 22:00 (exclusive), Asia/Kolkata. QR expires after 10 minutes or at 22:00, whichever comes first. The UI checks the window at generation time and removes expired QR images. It does not mark a student as having entered or left; real gate verification is a separate backend operation.
- **Long Pass:** Reason, destination, leave contact, future departure and expected return. Submissions appear as Pending in the warden queue for approval/rejection.
- QR content explicitly identifies itself as demo data, contains no student personal information, and uses the locally bundled MIT-licensed qrcode-generator 1.4.4 library. This is not a signed gate credential. Browser time and in-memory state are only suitable for demonstration.
- The clock window and 10-minute lifetime are defined in `QUICK_POLICY` in `passes.js`.
- Run `npm test` for rendering, state transitions and pass boundary checks. Browser checks require `npm install`, installed Google Chrome, and a running `npm start`; run `npm run test:browser`. Screenshots are saved in `screenshots/`.
- Restart `npm start` after server code changes to load the new script routes.


## Marksheet verification and year promotion

1. In Student > Documents, upload a sample PDF, JPG or PNG marksheet (maximum 5 MB). A ready-made fictional PNG is available at `fixtures/sample-marksheet.png`.
2. Switch roles using Preview Role without reloading. In Admin > Year Promotion, open the student's uploaded document and confirm that you reviewed eligibility.
3. Verify the marksheet, then confirm promotion and release of the current bed.
4. Study year and academic year advance by one. Profile, student ID, course, contacts and mess preference are preserved. The old allocation and marksheet are archived, the student awaits a new allocation, and the released bed updates hostel availability, room capacity, the occupancy visualization and CSV reports. Total room capacity does not change. Only a room with zero remaining residents is labeled Empty.
5. Admin > Audit Logs records verification and promotion. The Student dashboard and My Room show the updated year and allocation status.

This is a local in-memory workflow, not database integration. Uploaded files remain in this tab via Blob URLs and disappear on refresh. Use fictional test documents. Production needs authenticated upload storage, server-side document validation, an institutional promotion policy and an atomic promotion/allocation transaction. Final-year completion is a separate workflow and cannot use next-year promotion.

`npm run test:promotion` runs the end-to-end upload, verification, confirmation, room release, history and responsive-layout checks with Chrome and the local server running.

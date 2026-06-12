# Coinvera Firebase Security Plan

Coinvera uses the Firestore root collection `CoinveraData`.

The rules in `firestore.rules` and `storage.rules` are written for the product-grade Firebase Auth model:

- customers authenticate with Firebase Auth and own records through `authUid` / `customerAuthUid`
- staff/admin access is controlled through Firebase custom claims:
  - `role: "owner"`
  - `role: "manager"`
  - `role: "operator"`

Do not publish these strict rules until owner/manager/staff Firebase Auth accounts have matching custom claims. The current admin panel still has local prototype credentials, so strict rules would block admin writes until staff auth is migrated.

Recommended order:

1. Keep Email/Password Auth enabled.
2. Create Firebase Auth users for owner/manager/staff.
3. Set custom claims from a secure Admin SDK script or Cloud Function.
4. Migrate admin login to Firebase Auth.
5. Publish `firestore.rules` and `storage.rules`.
6. Move screenshots and QR uploads to Firebase Storage.

Firebase docs:

- Firestore rules use Firebase Authentication to build user and role based access: https://firebase.google.com/docs/firestore/security/get-started
- Custom claims can implement role based access control: https://firebase.google.com/docs/auth/admin/custom-claims
- Storage rules can check `request.auth.uid`: https://firebase.google.com/docs/storage/security

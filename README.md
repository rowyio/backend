<img src="logo-sticker.svg" alt="Rowy Run" height="60" />

Rowy Run is a Cloud Run instance that provides backend functionality, such as table action scripts, user management, and easy Cloud Function deployment.

### [Documentation →](https://docs.rowy.io/rowy-run)

## Install Rowy Run

---

### Required

Before starting, make sure you have a Google Cloud or Firebase project with
**Firestore** and **Firebase Authentication** enabled, and upgraded to the
**Blaze Plan**.

Don’t have a project? [Learn how to create one&nbsp;→](https://docs.rowy.io/setup/firebase-project)

---

If you installed Rowy using the [quick deploy method](https://docs.rowy.io/setup/install), Rowy
Run is already set up on your project.

You can use the one-click deploy button below.

[![Deploy to Google Cloud Run](https://deploy.cloud.run/button.svg)](https://deploy.cloud.run/?git_repo=https://github.com/rowyio/rowyRun.git)

Otherwise, you can install Rowy Run manually.

**Required software**

- [Git](https://git-scm.com/downloads)
- [Node](https://nodejs.org/en/download/) 14 (it’s easiest to install using
  [nvm](https://github.com/nvm-sh/nvm#intro))
- [Yarn](https://classic.yarnpkg.com/en/docs/install/) 1
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) 363+

1. Enable the Cloud Run Admin API in the
   [Google Cloud console &UpperRightArrow;](http://console.cloud.google.com/apis/library/run.googleapis.com)  
   Make sure you have
   [billing enabled](https://cloud.google.com/billing/docs/how-to/modify-project#confirm_billing_is_enabled_on_a_project)
   first.

2. Make sure you’ve initialized the gcloud CLI and signed in to the correct
   account.

   ```bash
   gcloud init
   ```

3. Clone the Rowy Run repo and open the created directory.

   ```bash
   git clone https://github.com/rowyio/rowyRun.git
   cd rowyRun
   ```

4. Install dependencies using Yarn.

   ```bash
   yarn
   ```

5. Run the deploy script with the correct project ID.

   ```bash
   ./deploy.sh --project [ID]
   ```

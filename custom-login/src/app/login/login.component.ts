/*!
 * Copyright (c) 2018, Okta, Inc. and/or its affiliates. All rights reserved.
 * The Okta software accompanied by this notice is provided pursuant to the Apache License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and limitations under the License.
 */

import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OKTA_AUTH } from '@okta/okta-angular';
import { OktaAuth, Tokens } from '@okta/okta-auth-js';
// @ts-ignore
import * as OktaSignIn from '@okta/okta-signin-widget';
import sampleConfig from '../app.config';

const DEFAULT_ORIGINAL_URI = window.location.origin;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  signIn: any;
  constructor(
    @Inject(OKTA_AUTH) public oktaAuth: OktaAuth,
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
  ) {
    this.signIn = new OktaSignIn({
      /**
       * Note: when using the Sign-In Widget for an OIDC flow, it still
       * needs to be configured with the base URL for your Okta Org. Here
       * we derive it from the given issuer for convenience.
       */
      baseUrl: sampleConfig.oidc.issuer.split('/oauth2')[0],
      clientId: sampleConfig.oidc.clientId,
      redirectUri: sampleConfig.oidc.redirectUri,
      logo: 'assets/angular.svg',
      i18n: {
        en: {
          'primaryauth.title': 'Sign in to Angular & Company',
        },
      },
      authClient: oktaAuth,
      useInteractionCodeFlow: sampleConfig.widget.useInteractionCodeFlow === 'true',
      multiOptionalFactorEnroll: false,
    });
  }

  ngOnInit() {
    // When navigating to a protected route, the route path will be saved as the `originalUri`
    // If no `originalUri` has been saved, then redirect back to the app root
    const originalUri = this.oktaAuth.getOriginalUri();
    if (!originalUri || originalUri === DEFAULT_ORIGINAL_URI) {
      this.oktaAuth.setOriginalUri('/');
    }

    // Add an event for enroll-choices
    let email = "";
    // Listen to ready events
    this.signIn.on("ready", (context: any) => {
      console.log("ready", context.controller);
      if (context.controller === "primary-auth") {
        const el = this.document.getElementById("okta-signin-username");
        // Get the 
        el?.addEventListener("change", function (event: any) {
          console.log(typeof event)
          if (event) {
            email = event.target.value;
            console.log(email)
          }
        });
      }
    });

    // Listen to afterRender events
    this.signIn.on("afterRender", (context: any) => {

      console.log("afterRender", context.controller);

      // This is when the enroll-choices view appear
      if (context.controller === "enroll-choices") {
        
        console.log(context.controller);

        // Hide the enroll-choices panel
        const enrollChoices =
          this.document.getElementsByClassName("enroll-choices")[0] as HTMLElement;

        // Build the HTML code
        const html = `
            <h2>We're enrolling your mobile number to MFA</h2>
            <p>Please wait for a moment. Kindly relogin after this page reloads.</p>
          `;
        enrollChoices.innerHTML = html;

        // Show the enrollChoices element
        enrollChoices.style.display = "block";

        // TODO: Call API to Enroll MFA for user with email
        // In the API call handler, do the following:
        // 1. Get the user's information from okta
        // 2. Get the user's phone number
        // 3. Enroll and auto-activate the user's phone number in MFA
        //    (See: https://developer.okta.com/docs/reference/api/factors/#enroll-and-auto-activate-okta-sms-factor)
        // For now we'll just set a 3 second timeout method 
        // to simulate the API call
        setTimeout(() => {
          // Redirect the user to the login page
          this.router.navigateByUrl('/login')
        }, 3000)

      } else if (context.controller === "mfa-verify") {

        // Add notice to wait for OTP
        const node = document.createElement("p");
        const textNotice = "Please do not re-attempt to login while waiting for your OTP. Thank you!";
        const textnode = document.createTextNode(textNotice);
        node.setAttribute('style', 'text-align: center; margin-top: 8px;')
        node.appendChild(textnode);
        const formButtonBar = this.document.getElementsByClassName('o-form-button-bar')[0]
        formButtonBar.appendChild(node);

        // 300 seconds (5 mins) timeout
        const TIMEOUT = 300;

        // Click auto-send button
        const smsGroup = this.document.getElementsByClassName("sms-request-button");
        const smsButton = smsGroup[0]
        if (smsButton) (smsButton as HTMLElement).click();

        // Disable resend button for 5 mins
        let smsTimeout = TIMEOUT
        const smsInterval = setInterval(function () {

          smsButton.setAttribute('disabled', '');
          smsButton.setAttribute('value', 'Sent');
          // Add disabled classes
          smsButton.classList.add('link-button-disabled')
          smsButton.classList.add('btn-disabled')
          smsButton.classList.add('disabled')

          // Hide the logout timeout warning
          const loginTimeoutWarning = document
            .getElementsByClassName('login-timeout-warning');
          loginTimeoutWarning && loginTimeoutWarning[0] ? 
            loginTimeoutWarning[0].setAttribute('style', 'display: none') 
            : null;

          if (smsTimeout === 0) {
            // Enable the button
            smsButton.removeAttribute('disabled')
            smsButton.setAttribute('value', 'Re-send code');
            // Remove disabled classes
            smsButton.classList.remove('link-button-disabled')
            smsButton.classList.remove('btn-disabled')
            smsButton.classList.remove('disabled')
            // Show the login timeout warning
            loginTimeoutWarning[0].setAttribute('style', 'display: block');
            // Clear the interval
            clearInterval(smsInterval);
          }

          smsTimeout--;

        }, 1000);

        // Confirm button

        const buttonsContainer = this.document
          .getElementsByClassName('o-form-button-bar')
        const buttons = buttonsContainer[0]
          .getElementsByClassName('button-primary')
        const button = buttons[0] as HTMLElement

        let timeout = TIMEOUT
        const interval = setInterval(function () {
          // Set the label
          const label = `CONFIRM (${timeout})`;
          button.setAttribute('value', label)
          if (timeout === 0) {
            const newLabel = `CONFIRM`;
            button.setAttribute('value', newLabel)
            // Clear the interval
            clearInterval(interval);
          }
          timeout--;
        }, 1000)

        button.addEventListener('click', function() {
          const label = `CONFIRM`;
          button.setAttribute('value', label)
          clearInterval(interval);
        })

      }

    });
    
    this.signIn.showSignInToGetTokens({
      el: '#sign-in-widget',
      scopes: sampleConfig.oidc.scopes
    }).then((tokens: Tokens) => {
      // Remove the widget
      this.signIn.remove();

      // In this flow the redirect to Okta occurs in a hidden iframe
      this.oktaAuth.handleLoginRedirect(tokens);
    }).catch((err: any) => {
      // Typically due to misconfiguration
      throw err;
    });
  }

  ngOnDestroy() {
    this.signIn.remove();
  }

}

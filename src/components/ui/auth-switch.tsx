"use client";

import { useState, type FormEvent } from "react";
import { Mail, Lock, User } from "lucide-react";

export default function AuthSwitch({
  onLoginSuccess,
}: {
  onLoginSuccess?: (data: any) => void;
} = {}) {
  const [isSignUp, setIsSignUp] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className="auth-switch">
      <style>{`
        .auth-switch,
        .auth-switch * {
          box-sizing: border-box;
        }

        .auth-switch {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 50%, #ea580c 100%);
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 20px;
          position: relative;
        }

        .center-logo-badge {
          position: absolute;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.95);
          padding: 10px 22px;
          border-radius: 9999px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
          z-index: 20;
          border: 1px solid rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(8px);
        }

        .center-logo-badge img {
          height: 38px;
          width: 38px;
          object-fit: contain;
        }

        .center-logo-text {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }

        .center-logo-title {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .center-logo-subtitle {
          font-size: 10px;
          font-weight: 600;
          color: #ea580c;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .container {
          position: relative;
          width: 100%;
          max-width: 960px;
          height: 580px;
          background: white;
          border-radius: 24px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35);
          overflow: hidden;
          margin-top: 50px;
        }

        .container-center-emblem {
          position: absolute;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 15;
          display: flex;
          flex-direction: column;
          align-items: center;
          pointer-events: none;
        }

        .container-center-emblem .emblem-circle {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #f1f5f9;
        }

        .container-center-emblem img {
          width: 36px;
          height: 36px;
          object-fit: contain;
        }

        .forms-container {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
        }

        .signin-signup {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          left: 75%;
          width: 50%;
          transition: 1s 0.7s ease-in-out;
          display: grid;
          grid-template-columns: 1fr;
          z-index: 5;
        }

        form {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 0 4.5rem;
          transition: all 0.2s 0.7s;
          overflow: hidden;
          grid-column: 1 / 2;
          grid-row: 1 / 2;
        }

        form.sign-up-form {
          opacity: 0;
          z-index: 1;
        }

        form.sign-in-form {
          z-index: 2;
        }

        .title {
          font-size: 2rem;
          color: #1e293b;
          margin-bottom: 6px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .subtitle {
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 16px;
          text-align: center;
        }

        .input-field {
          max-width: 380px;
          width: 100%;
          background-color: #f1f5f9;
          margin: 8px 0;
          height: 50px;
          border-radius: 50px;
          display: grid;
          grid-template-columns: 15% 85%;
          padding: 0 0.6rem;
          position: relative;
          transition: 0.3s;
          border: 1px solid transparent;
        }

        .input-field:focus-within {
          background-color: #ffffff;
          border-color: #0284c7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
        }

        .input-field .field-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          transition: 0.3s;
        }

        .input-field:focus-within .field-icon {
          color: #0284c7;
        }

        .input-field input {
          background: none;
          outline: none;
          border: none;
          line-height: 1;
          font-weight: 500;
          font-size: 0.95rem;
          color: #0f172a;
          width: 100%;
        }

        .input-field input::placeholder {
          color: #94a3b8;
          font-weight: 400;
        }

        .btn {
          width: 160px;
          background: linear-gradient(135deg, #0284c7 0%, #1e40af 100%);
          border: none;
          outline: none;
          height: 48px;
          border-radius: 48px;
          color: #fff;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.05em;
          margin: 14px 0 8px;
          cursor: pointer;
          transition: 0.3s;
          font-size: 0.85rem;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
        }

        .btn:hover {
          background: linear-gradient(135deg, #0369a1 0%, #1e3a8a 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(2, 132, 199, 0.4);
        }

        .panels-container {
          position: absolute;
          height: 100%;
          width: 100%;
          top: 0;
          left: 0;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
        }

        .panel {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: space-around;
          text-align: center;
          z-index: 6;
        }

        .left-panel {
          pointer-events: all;
          padding: 3rem 17% 2rem 12%;
        }

        .right-panel {
          pointer-events: none;
          padding: 3rem 12% 2rem 17%;
        }

        .panel .content {
          color: #fff;
          transition: transform 0.9s ease-in-out;
          transition-delay: 0.6s;
        }

        .panel h3 {
          font-weight: 800;
          line-height: 1.1;
          font-size: 1.7rem;
          margin-bottom: 10px;
          letter-spacing: -0.02em;
        }

        .panel p {
          font-size: 0.95rem;
          padding: 0.7rem 0;
          opacity: 0.92;
          line-height: 1.5;
        }

        .btn.transparent {
          margin: 0;
          background: transparent;
          border: 2px solid #fff;
          width: 140px;
          height: 44px;
          font-weight: 700;
          font-size: 0.82rem;
          color: #fff;
          border-radius: 44px;
          letter-spacing: 0.05em;
        }

        .btn.transparent:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        .right-panel .content {
          transform: translateX(800px);
        }

        .container.sign-up-mode:before {
          transform: translate(100%, -50%);
          right: 52%;
        }

        .container.sign-up-mode .left-panel .content {
          transform: translateX(-800px);
        }

        .container.sign-up-mode .signin-signup {
          left: 25%;
        }

        .container.sign-up-mode form.sign-up-form {
          opacity: 1;
          z-index: 2;
        }

        .container.sign-up-mode form.sign-in-form {
          opacity: 0;
          z-index: 1;
        }

        .container.sign-up-mode .right-panel .content {
          transform: translateX(0%);
        }

        .container.sign-up-mode .left-panel {
          pointer-events: none;
        }

        .container.sign-up-mode .right-panel {
          pointer-events: all;
        }

        .container:before {
          content: "";
          position: absolute;
          height: 2000px;
          width: 2000px;
          top: -10%;
          right: 48%;
          transform: translateY(-50%);
          background: linear-gradient(-45deg, #0284c7 0%, #1e3a8a 60%, #ea580c 100%);
          transition: 1.8s ease-in-out;
          border-radius: 50%;
          z-index: 6;
        }

        .social-text {
          padding: 0.6rem 0;
          font-size: 0.85rem;
          color: #64748b;
        }

        .social-media {
          display: flex;
          justify-content: center;
          gap: 12px;
        }

        .social-icon {
          height: 42px;
          width: 42px;
          display: flex;
          justify-content: center;
          align-items: center;
          border: 1px solid #e2e8f0;
          border-radius: 50%;
          color: #0284c7;
          font-size: 1.1rem;
          transition: 0.3s;
          cursor: pointer;
          background: #ffffff;
        }

        .social-icon:hover {
          border-color: #0284c7;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.2);
        }

        @media (max-width: 870px) {
          .container {
            min-height: 800px;
            height: auto;
            margin-top: 60px;
          }
          .signin-signup {
            width: 100%;
            top: 95%;
            transform: translate(-50%, -100%);
            transition: 1s 0.8s ease-in-out;
          }
          .signin-signup,
          .container.sign-up-mode .signin-signup {
            left: 50%;
          }
          .panels-container {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr 2fr 1fr;
          }
          .panel {
            flex-direction: row;
            justify-content: space-around;
            align-items: center;
            padding: 2.5rem 8%;
            grid-column: 1 / 2;
          }
          .right-panel {
            grid-row: 3 / 4;
          }
          .left-panel {
            grid-row: 1 / 2;
          }
          .panel .content {
            padding-right: 15%;
            transition: transform 0.9s ease-in-out;
            transition-delay: 0.8s;
          }
          .panel h3 {
            font-size: 1.2rem;
          }
          .panel p {
            font-size: 0.75rem;
            padding: 0.5rem 0;
          }
          .btn.transparent {
            width: 110px;
            height: 36px;
            font-size: 0.75rem;
          }
          .container:before {
            width: 1500px;
            height: 1500px;
            transform: translateX(-50%);
            left: 30%;
            bottom: 68%;
            right: initial;
            top: initial;
            transition: 2s ease-in-out;
          }
          .container.sign-up-mode:before {
            transform: translate(-50%, 100%);
            bottom: 32%;
            right: initial;
          }
          .container.sign-up-mode .left-panel .content {
            transform: translateY(-300px);
          }
          .container.sign-up-mode .right-panel .content {
            transform: translateY(0px);
          }
          .right-panel .content {
            transform: translateY(300px);
          }
          .container.sign-up-mode .signin-signup {
            top: 5%;
            transform: translate(-50%, 0);
          }
        }

        @media (max-width: 570px) {
          form {
            padding: 0 1.5rem;
          }
          .panel .content {
            padding: 0.5rem 1rem;
          }
        }
      `}</style>

      {/* Prominent Center Logo Badge */}
      <div className="center-logo-badge">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/nis-mark.png" alt="Nehru International School" />
        <div className="center-logo-text">
          <span className="center-logo-title">Nehru International School</span>
          <span className="center-logo-subtitle">A Tradition of Excellence</span>
        </div>
      </div>

      <div className={isSignUp ? "container sign-up-mode" : "container"}>
        {/* Central emblem right in the center of the card */}
        <div className="container-center-emblem">
          <div className="emblem-circle">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nis-mark.png" alt="NIS Emblem" />
          </div>
        </div>

        <div className="forms-container">
          <div className="signin-signup">
            <form className="sign-in-form" onSubmit={onSubmit}>
              <h2 className="title">Sign in</h2>
              <p className="subtitle">Access your Nehru ERP institutional workspace</p>
              <div className="input-field">
                <span className="field-icon">
                  <Mail className="h-4 w-4" />
                </span>
                <input type="email" placeholder="Institutional Email" />
              </div>
              <div className="input-field">
                <span className="field-icon">
                  <Lock className="h-4 w-4" />
                </span>
                <input type="password" placeholder="Password" />
              </div>
              <input type="submit" value="Sign in" className="btn solid" />
              <p className="social-text">Or sign in with secure SSO</p>
              <div className="social-media">
                <SocialIcons />
              </div>
            </form>

            <form className="sign-up-form" onSubmit={onSubmit}>
              <h2 className="title">Admissions</h2>
              <p className="subtitle">Register new student application or parent account</p>
              <div className="input-field">
                <span className="field-icon">
                  <User className="h-4 w-4" />
                </span>
                <input type="text" placeholder="Full Name" />
              </div>
              <div className="input-field">
                <span className="field-icon">
                  <Mail className="h-4 w-4" />
                </span>
                <input type="email" placeholder="Email Address" />
              </div>
              <div className="input-field">
                <span className="field-icon">
                  <Lock className="h-4 w-4" />
                </span>
                <input type="password" placeholder="Create Password" />
              </div>
              <input type="submit" value="Register" className="btn" />
              <p className="social-text">Or register with verified portal</p>
              <div className="social-media">
                <SocialIcons />
              </div>
            </form>
          </div>
        </div>

        <div className="panels-container">
          <div className="panel left-panel">
            <div className="content">
              <h3>New to Nehru ERP?</h3>
              <p>
                Apply for admission, register as a parent, or enquire about
                academic programs at Nehru International School.
              </p>
              <button
                type="button"
                className="btn transparent"
                onClick={() => setIsSignUp(true)}
              >
                Register
              </button>
            </div>
          </div>

          <div className="panel right-panel">
            <div className="content">
              <h3>Existing Member?</h3>
              <p>
                Sign in to your Student, Teacher, Parent, or Administrative portal to
                manage academics, attendance, and campus operations.
              </p>
              <button
                type="button"
                className="btn transparent"
                onClick={() => setIsSignUp(false)}
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SocialIcons() {
  return (
    <>
      <a href="#" className="social-icon" aria-label="Google Workspace SSO" title="Google Workspace">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
      </a>
      <a href="#" className="social-icon" aria-label="Microsoft 365 Education" title="Microsoft 365">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
        >
          <path fill="#f25022" d="M1 1h10v10H1z" />
          <path fill="#00a4ef" d="M1 13h10v10H1z" />
          <path fill="#7fba00" d="M13 1h10v10H13z" />
          <path fill="#ffb900" d="M13 13h10v10H13z" />
        </svg>
      </a>
      <a href="#" className="social-icon" aria-label="Campus Smart ID" title="Campus Smart ID">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="#0284c7"
        >
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </a>
    </>
  );
}


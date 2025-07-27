// emailService.js
import transporter from './emailconfig.js';
import { URL } from 'url';

async function sendVerificationEmailTwo(email: string , verificationToken: string) {

    if (!email) {
        console.error("No recipient email defined");
        return;
    }
    // const verificationURL = new URL(`https://smsportalgivenbysir.vercel.app/verify-email`);
    const verificationURL = new URL(`https://luxury-stay-lyart.vercel.app/verify-email-two`);

    verificationURL.searchParams.append('token', verificationToken);

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email, // Ensure this is correctly defined
        subject: 'Verify Your Email',
        text: `Thank you for recovering your password up on LuxuryStay. To recover your password kindly click the link below: ${verificationURL}`,
        html: `
            <p>Please verify your email for recovering your password on LuxuryStay by clicking on the following link:</p>
            <p><a href="${verificationURL}">Verify Email</a></p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Verification email sent successfully");
    } catch (error) {
        console.error("Failed to send verification email:", error);
    }
}

async function sendVerificationEmail(email: string , verificationToken: string) {

    if (!email) {
        console.error("No recipient email defined");
        return;
    }
    // const verificationURL = new URL(`https://smsportalgivenbysir.vercel.app/verify-email`);
    const verificationURL = new URL(`https://luxury-stay-lyart.vercel.app/verify-email`);

    verificationURL.searchParams.append('token', verificationToken);

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email, // Ensure this is correctly defined
        subject: 'Verify Your Email',
        text: `Thank you for signing up on LuxuryStay. To activate your account kindly click the link below then sign in with your credentials: ${verificationURL}`,
        html: `
            <p>Please verify your email for using LuxuryStay by clicking on the following link:</p>
            <p><a href="${verificationURL}">Verify Email</a></p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Verification email sent successfully");
    } catch (error) {
        console.error("Failed to send verification email:", error);
    }
}

async function notifyUser(email: string , text: string) {

    if (!email) {
        console.error("No recipient email defined");
        return;
    }
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email, // Ensure this is correctly defined
        subject: 'User Notification',
        text: `LuxuryStay`,
        html: `
            <p>${text}</p>
            `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Notification email sent successfully");
    } catch (error) {
        console.error("Failed to send notification email:", error);
    }
}

export { sendVerificationEmail, notifyUser, sendVerificationEmailTwo };
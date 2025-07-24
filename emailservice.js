// emailService.js
import transporter from './emailconfig.js';
import { URL } from 'url';
async function sendVerificationEmail(email, verificationToken) {
    if (!email) {
        console.error("No recipient email defined");
        return;
    }
    // const verificationURL = new URL(`https://smsportalgivenbysir.vercel.app/verify-email`);
    const verificationURL = new URL(`https://luxury-stay-lyart.vercel.app/api/auth/verify-email`);
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
    }
    catch (error) {
        console.error("Failed to send verification email:", error);
    }
}
export { sendVerificationEmail };

import nodemailer from "nodemailer";

function sendEmail(from, to, subject, text) {
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_GMAIL_USER,
      pass: process.env.SMTP_GMAIL_APP_PASSWORD,
    },
  });

  const mailOptions = {
    from,
    to,
    subject,
    text,
  };

  // a promise will be returned from this function
  return transport.sendMail(mailOptions);
}

export default sendEmail;

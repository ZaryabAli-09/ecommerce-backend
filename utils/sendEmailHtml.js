import nodemailer from "nodemailer";

function sendEmailHtml(from, to, subject, html) {
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
    html,
  };

  // a promise will be returned from this function
  return transport.sendMail(mailOptions);
}

export default sendEmailHtml;

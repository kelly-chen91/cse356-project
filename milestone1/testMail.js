const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'localhost',
    port: 25,
    secure: false
});

const mailOptions = {
    from: '"DoITSeven11" <noreply@yourserver.com>',
    to: "kelly.chen.6@stonybrook.edu, yao.cheng@stonybrook.edu, zhenting.ling@stonybrook.edu, zhenbin.lin@stonybrook.edu",
    subject: 'We Just Setup our SMTP server!!! RAHHAHAHAHAHHAHAH',
    text: `YESSSSSS!!!!!!!!`,
    html: '<a href="https://youtu.be/dQw4w9WgXcQ?si=GnyrK0pHQGWIDeIb">Click This to verify your team membership</a>'
}

transporter.sendMail(mailOptions);

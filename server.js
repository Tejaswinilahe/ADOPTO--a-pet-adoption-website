const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;
const saltRounds = 10;

// Middleware setup
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Append extension
  }
});

const upload = multer({ storage: storage });

// Session setup
app.use(session({
  secret: 'your_secret_key', // It's important to use a real secret key in production
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if you are using HTTPS
}));

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'adopto_db'
});

// Connect to the database and start the server
db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('MySQL connected...');
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});

// Endpoint for contact form submissions
app.post('/contact-submit', (req, res) => {
  const { name, email, message } = req.body;
  const sql = 'INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)';
  
  db.query(sql, [name, email, message], (err, result) => {
    if (err) {
      console.error('Error inserting contact data:', err);
      res.status(500).send('Error submitting contact form');
      return;
    }
    console.log('Contact form data inserted:', result);
    res.redirect('http://localhost:3000/contact_success.html');
  });
});

// Endpoint for volunteer form submissions
app.post('/volunteer-submit', (req, res) => {
  const { name, email, phone, message } = req.body;
  const sql = 'INSERT INTO volunteers (name, email, phone, message) VALUES (?, ?, ?, ?)';
  
  db.query(sql, [name, email, phone, message], (err, result) => {
    if (err) {
      console.error('Error inserting volunteer data:', err);
      res.status(500).send('Error submitting volunteer application');
      return;
    }
    console.log('Volunteer application data inserted:', result);
    res.redirect('http://localhost:3000/volunteer_success.html');
  });
});

// Endpoint for donation form submissions
app.post('/donate-submit', (req, res) => {
  const { amount, full_name, email, payment_method } = req.body;
  const sql = 'INSERT INTO donations (amount, full_name, email, payment_method) VALUES (?, ?, ?, ?)';
  
  db.query(sql, [amount, full_name, email, payment_method], (err, result) => {
    if (err) {
      console.error('Error inserting donation data:', err);
      res.status(500).send('Error submitting donation form');
      return;
    }
    console.log('Donation data inserted:', result);
    res.redirect('http://localhost:3000/donation_success.html');
  });
});

// Endpoint for user signup
app.post('/signup', (req, res) => {
  const { username, email, password } = req.body;
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      console.error('Error hashing password:', err);
      return res.status(500).send('Error creating user');
    }
    const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
    db.query(sql, [username, email, hash], (err, result) => {
      if (err) {
        console.error('Error inserting user:', err);
        return res.status(500).send('Error creating user');
      }
      console.log('User created:', result.insertId);
      res.redirect('/success.html');
    });
  });
});

// Endpoint for adoption form submissions
app.post('/adoption-submit', (req, res) => {
  const { name, email, phone, address, 'pet-interest': petInterest, experience, 'living-situation': livingSituation, 'why-adopt': whyAdopt } = req.body;
  const sql = 'INSERT INTO adoptions (name, email, phone, address, pet_interest, experience, living_situation, why_adopt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  
  db.query(sql, [name, email, phone, address, petInterest, experience, livingSituation, whyAdopt], (err, result) => {
    if (err) {
      console.error('Error inserting adoption data:', err);
      res.status(500).send('Error submitting adoption application');
      return;
    }
    console.log('Adoption application data inserted:', result);
    res.redirect('http://localhost:3000/adoption_success.html'); 
  });
});

// Endpoint for user login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM users WHERE username = ?';

  db.query(sql, [username], (err, results) => {
    if (err) {
      console.error('Error fetching user:', err);
      res.status(500).send('Error logging in');
      return;
    }

    if (results.length > 0) {
      const user = results[0];
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          console.error('Error comparing passwords:', err);
          res.status(500).send('Error logging in');
          return;
        }

        if (isMatch) {
          req.session.user = user;
          console.log('User logged in:', user.username);
          res.redirect('http://localhost:3000/login_success.html');
        } else {
          res.status(401).send('Invalid username or password');
        }
      });
    } else {
      res.status(401).send('Invalid username or password');
    }
  });
});

// Endpoint for feedback form submissions
app.post('/feedback-submit', upload.single('image'), (req, res) => {
  const { name, email, feedback } = req.body;
  const imagePath = req.file ? req.file.path : null;

  const sql = 'INSERT INTO feedback (name, email, feedback, image_path) VALUES (?, ?, ?, ?)';
  
  db.query(sql, [name, email, feedback, imagePath], (err, result) => {
    if (err) {
      console.error('Error inserting feedback data:', err);
      res.status(500).send('Error submitting feedback');
      return;
    }
    console.log('Feedback data inserted:', result);
    res.redirect('http://localhost:3000/feedback_success.html');
  });
});

// Endpoint to get all feedback
app.get('/feedbacks', (req, res) => {
  const sql = 'SELECT name, feedback, image_path FROM feedback ORDER BY submission_date DESC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching feedback:', err);
      res.status(500).send('Error fetching feedback');
      return;
    }
    res.json(results);
  });
});
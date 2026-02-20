import { useState } from 'react';
import { Container, Row, Col, Button, ButtonGroup, Card } from 'react-bootstrap';
import StudentHeader from '../components/StudentHeader';
import Footer from '../components/Footer';

const StudySpaces = () => {

  return (
    <div className="d-flex flex-column min-vh-100 bg-light" style={{ paddingTop: '56px' }}>
      <StudentHeader />
      
      <main className="flex-grow-1">
        <Container className="py-5">
          <header className="mb-4 d-flex justify-content-between align-items-center">
            <div>
              <h1 className="fw-bold">Study Spaces</h1>
              <p className="text-muted">View available rooms and computers and make reservations.</p>
            </div>
            </header>
        </Container>
      </main>
      <Footer />
    </div>
  );
};

export default StudySpaces;
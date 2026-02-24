import React, { useState, useEffect } from 'react';
import { Award, Download, Calendar, GraduationCap } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CertificatesPage = () => {
  const { token, user } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [certRes, enrollRes] = await Promise.all([
          axios.get(`${API}/certificates`, { headers }),
          axios.get(`${API}/enrollments`, { headers })
        ]);
        setCertificates(certRes.data);
        setEnrollments(enrollRes.data);
      } catch (error) {
        console.error('Failed to fetch certificates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const completedEnrollments = enrollments.filter(e => e.status === 'completed');
  const pendingCerts = completedEnrollments.filter(
    e => !certificates.find(c => c.course_id === e.course_id)
  );

  const generateCertificate = async (enrollmentId) => {
    try {
      const res = await axios.post(
        `${API}/certificates/${enrollmentId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCertificates(prev => [...prev, res.data]);
    } catch (error) {
      console.error('Failed to generate certificate:', error);
    }
  };

  const printCertificate = (cert) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificate - ${cert.course_title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Inter:wght@400&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Inter', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #f8fafc;
            padding: 40px;
          }
          .certificate {
            width: 800px;
            padding: 60px;
            background: white;
            border: 3px solid #4F46E5;
            border-radius: 16px;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);
          }
          .logo {
            font-family: 'Outfit', sans-serif;
            font-size: 28px;
            font-weight: 700;
            color: #4F46E5;
            margin-bottom: 20px;
          }
          .title {
            font-family: 'Outfit', sans-serif;
            font-size: 36px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 10px;
          }
          .subtitle {
            color: #64748b;
            margin-bottom: 40px;
          }
          .recipient {
            font-family: 'Outfit', sans-serif;
            font-size: 32px;
            font-weight: 600;
            color: #0f766e;
            margin: 30px 0;
            padding: 20px 0;
            border-top: 2px solid #e2e8f0;
            border-bottom: 2px solid #e2e8f0;
          }
          .course {
            font-size: 20px;
            color: #334155;
            margin-bottom: 10px;
          }
          .grade {
            display: inline-block;
            background: #4F46E5;
            color: white;
            padding: 8px 24px;
            border-radius: 100px;
            font-weight: 600;
            margin: 20px 0;
          }
          .date {
            color: #64748b;
            font-size: 14px;
            margin-top: 30px;
          }
          .id {
            font-family: monospace;
            font-size: 12px;
            color: #94a3b8;
            margin-top: 10px;
          }
          @media print {
            body { background: white; padding: 0; }
            .certificate { box-shadow: none; border-width: 2px; }
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="logo">LibCollab</div>
          <div class="title">Certificate of Completion</div>
          <div class="subtitle">This is to certify that</div>
          <div class="recipient">${cert.user_name}</div>
          <div class="course">has successfully completed the course</div>
          <div style="font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 600; color: #1e293b; margin: 15px 0;">
            ${cert.course_title}
          </div>
          <div class="grade">Grade: ${cert.grade}</div>
          <div class="date">Issued on ${new Date(cert.issue_date).toLocaleDateString('en-US', { 
            year: 'numeric', month: 'long', day: 'numeric' 
          })}</div>
          <div class="id">Certificate ID: ${cert.id}</div>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => <div key={i} className="h-48 bg-muted rounded-xl" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="certificates-page">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Certificates</h1>
          <p className="text-muted-foreground mt-1">
            Your earned certificates and achievements
          </p>
        </div>

        {/* Earned Certificates */}
        {certificates.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Earned Certificates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {certificates.map((cert, index) => (
                <Card 
                  key={cert.id} 
                  className={`overflow-hidden animate-fadeInUp stagger-${(index % 2) + 1}`}
                  data-testid={`certificate-card-${cert.id}`}
                >
                  <div className="h-2 bg-gradient-to-r from-primary to-teal-500" />
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Award className="w-7 h-7 text-primary" />
                      </div>
                      <Badge className="bg-primary/10 text-primary">
                        Grade {cert.grade}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{cert.course_title}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mb-4">
                      <Calendar className="w-4 h-4" />
                      Issued: {new Date(cert.issue_date).toLocaleDateString()}
                    </p>
                    <Button 
                      className="w-full gap-2"
                      onClick={() => printCertificate(cert)}
                      data-testid={`download-cert-${cert.id}`}
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Pending Certificates */}
        {pendingCerts.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Generate Certificates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingCerts.map((enrollment) => (
                <Card key={enrollment.id} className="border-dashed">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{enrollment.course_title}</h3>
                        <p className="text-sm text-green-600">Course Completed!</p>
                      </div>
                      <Button 
                        onClick={() => generateCertificate(enrollment.id)}
                        data-testid={`generate-cert-${enrollment.id}`}
                      >
                        Generate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {certificates.length === 0 && pendingCerts.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Award className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Certificates Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Complete courses to earn certificates. Your achievements will appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CertificatesPage;

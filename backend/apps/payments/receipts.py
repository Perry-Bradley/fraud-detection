"""PDF receipt generation using ReportLab."""
import io
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas


def render_receipt_pdf(payment) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A5)
    width, height = A5

    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width / 2, height - 2 * cm, "OFFICIAL FEE RECEIPT")

    c.setFont("Helvetica", 10)
    c.drawCentredString(width / 2, height - 2.7 * cm, "School Fees Management System")

    c.line(1 * cm, height - 3 * cm, width - 1 * cm, height - 3 * cm)

    y = height - 4 * cm
    rows = [
        ("Receipt No.", payment.receipt_no),
        ("Date", payment.payment_date.strftime("%Y-%m-%d %H:%M")),
        ("Student", payment.student.full_name),
        ("Matricule", payment.student.matricule),
        ("Class", payment.student.class_name),
        ("Amount (FCFA)", f"{payment.amount:,.2f}"),
        ("Method", payment.get_method_display()),
        ("Reference", payment.reference or "-"),
        ("Recorded by", payment.recorded_by.username if payment.recorded_by else "system"),
    ]

    c.setFont("Helvetica", 11)
    for label, value in rows:
        c.drawString(1.5 * cm, y, f"{label}:")
        c.drawString(6 * cm, y, str(value))
        y -= 0.7 * cm

    if payment.is_anomalous:
        c.setFillColorRGB(0.8, 0.1, 0.1)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(1.5 * cm, y - 0.5 * cm, "** Flagged for review (anomaly detected) **")
        c.setFillColorRGB(0, 0, 0)

    c.line(1 * cm, 2 * cm, width - 1 * cm, 2 * cm)
    c.setFont("Helvetica-Oblique", 8)
    c.drawCentredString(width / 2, 1.5 * cm, "This receipt is computer-generated. Verify with the bursary office.")

    c.showPage()
    c.save()
    return buf.getvalue()

import uuid
from django.db import models


class FeeStructure(models.Model):
    class Term(models.TextChoices):
        TERM_1 = "term_1", "Term 1"
        TERM_2 = "term_2", "Term 2"
        TERM_3 = "term_3", "Term 3"
        ANNUAL = "annual", "Annual"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_name = models.CharField(max_length=50, db_index=True)
    term = models.CharField(max_length=20, choices=Term.choices)
    academic_year = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("class_name", "term", "academic_year")
        ordering = ("academic_year", "class_name", "term")

    def __str__(self) -> str:
        return f"{self.class_name} {self.term} {self.academic_year}: {self.amount}"

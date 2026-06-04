HOW TO ADD THE SCREENSHOTS TO THE REPORT
========================================

Save each screenshot into THIS folder using the EXACT filename below, then
re-run the generator:

    cd c:\Users\USER\Desktop\All\SMS418\report
    python generate_report.py

Present files are embedded automatically; missing ones show a placeholder box,
so you can add them one at a time.

FILENAME                  ->  WHICH SCREENSHOT / FIGURE
--------                      -------------------------
docker_desktop.png        ->  Figure 1: Docker Desktop with all the containers running.
swagger_docs.png          ->  Figure 2: the Swagger / OpenAPI docs (localhost:5000/api/docs).
fraud_notifications.png   ->  Figure 3: the Fraud Detection page with the Notifications drawer.
fraud_trend.png           ->  Figure 4: the Fraud Detection Detection-Trend + Most-Common-Reasons.
ci_circleci.png           ->  Figure 5: the CircleCI pipeline view (ml-tests / frontend-build /
                                         backend-tests / deploy jobs).
railway_production.png    ->  Figure 6: the Railway production environment (all services Online).
                                         TIP: rename the Railway services to sms-backend /
                                         sms-frontend / sms-ml first, then screenshot.
dashboard_kpis.png        ->  Figure 7: the dashboard top (KPI cards + collection rate +
                                         payment-methods donut).
dashboard_defaulters.png  ->  Figure 8: the dashboard (Top Defaulters + Recent Activity).

(The GitHub Actions billing screenshot is no longer used.)

OPTIONAL
--------
ub_logo.png               ->  University of Buea crest on the cover page.

AFTER REGENERATING
------------------
Open the .docx in Word/WPS, press Ctrl+A then F9 (Update Field) to fill in the
Table of Contents, the List of Figures and the page numbers.

NOTE: close the .docx in your office app before re-running the generator,
otherwise the file is locked and cannot be overwritten.

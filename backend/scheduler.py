from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
from pathlib import Path
from backend.etl import process_attendance_file, load_attendance_to_database
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv("env/.env")


scheduler = BackgroundScheduler()


def daily_etl_job():
    print(f"🟢 Daily ETL job started at {datetime.now()}")

    upload_folder = Path("data/uploads")

    csv_files = list(upload_folder.glob("*.csv"))

    if not csv_files:
        print("ℹ️ No CSV files found for ETL processing.")
        return

    for file_path in csv_files:
        try:
            print(f"📄 Processing: {file_path.name}")

            df = process_attendance_file(str(file_path))

            load_attendance_to_database(df)

            print(f"✅ ETL completed: {file_path.name}")

        except Exception as error:
            print(
                f"❌ ETL failed for {file_path.name}: {error}"
            )


def weekly_rollup_job():
    print(f"🟢 Weekly rollup job started at {datetime.now()}")

    from backend.database import engine
    from sqlalchemy import text

    try:
        with engine.connect() as connection:
            result = connection.execute(
                text("""
                    SELECT
                        COUNT(*) AS total_records,

                        SUM(
                            CASE
                                WHEN status = 'Present' THEN 1
                                ELSE 0
                            END
                        ) AS present_count,

                        SUM(
                            CASE
                                WHEN status = 'Absent' THEN 1
                                ELSE 0
                            END
                        ) AS absent_count,

                        SUM(
                            CASE
                                WHEN status = 'Late' THEN 1
                                ELSE 0
                            END
                        ) AS late_count,

                        ROUND(
                            AVG(working_hours),
                            2
                        ) AS average_working_hours,

                        ROUND(
                            SUM(overtime_hours),
                            2
                        ) AS total_overtime_hours

                    FROM attendance_logs

                    WHERE attendance_date >=
                        DATE_SUB(CURDATE(), INTERVAL 7 DAY)

                      AND attendance_date < CURDATE()
                """)
            )

            summary = dict(result.mappings().first())

            print("✅ Weekly rollup completed")
            print(f"   Total records: {summary['total_records']}")
            print(f"   Present: {summary['present_count']}")
            print(f"   Absent: {summary['absent_count']}")
            print(f"   Late: {summary['late_count']}")
            print(
                f"   Average working hours: "
                f"{summary['average_working_hours']}"
            )
            print(
                f"   Total overtime hours: "
                f"{summary['total_overtime_hours']}"
            )

    except Exception as error:
        print(f"❌ Weekly rollup failed: {error}")


def update_dashboard_metrics_job():
    print(f"🟢 Dashboard metrics job started at {datetime.now()}")

    from backend.database import engine
    from sqlalchemy import text

    try:
        with engine.connect() as connection:
            result = connection.execute(
                text("""
                    SELECT
                        COUNT(*) AS total_records,

                        SUM(
                            CASE
                                WHEN status = 'Present' THEN 1
                                ELSE 0
                            END
                        ) AS present_count,

                        SUM(
                            CASE
                                WHEN status = 'Absent' THEN 1
                                ELSE 0
                            END
                        ) AS absent_count,

                        SUM(
                            CASE
                                WHEN status = 'Late' THEN 1
                                ELSE 0
                            END
                        ) AS late_count,

                        ROUND(
                            SUM(
                                CASE
                                    WHEN status = 'Present' THEN 1
                                    ELSE 0
                                END
                            ) / NULLIF(COUNT(*), 0) * 100,
                            2
                        ) AS attendance_rate,

                        ROUND(
                            SUM(overtime_hours),
                            2
                        ) AS total_overtime_hours

                    FROM attendance_logs
                """)
            )

            metrics = dict(result.mappings().first())

            print("✅ Dashboard metrics updated")
            print(f"   Total records: {metrics['total_records']}")
            print(f"   Present: {metrics['present_count']}")
            print(f"   Absent: {metrics['absent_count']}")
            print(f"   Late: {metrics['late_count']}")
            print(f"   Attendance rate: {metrics['attendance_rate']}%")
            print(
                f"   Total overtime: "
                f"{metrics['total_overtime_hours']}"
            )

    except Exception as error:
        print(f"❌ Dashboard metrics update failed: {error}")


def generate_daily_report_job():
    print(f"🟢 Daily report job started at {datetime.now()}")

    from backend.database import engine

    try:
        with engine.connect() as connection:
            result = connection.execute(
                text("""
                    SELECT
                        a.attendance_date,
                        COUNT(*) AS total_records,

                        SUM(
                            CASE
                                WHEN a.status = 'Present' THEN 1
                                ELSE 0
                            END
                        ) AS present_count,

                        SUM(
                            CASE
                                WHEN a.status = 'Absent' THEN 1
                                ELSE 0
                            END
                        ) AS absent_count,

                        SUM(
                            CASE
                                WHEN a.status = 'Late' THEN 1
                                ELSE 0
                            END
                        ) AS late_count,

                        ROUND(
                            AVG(a.working_hours),
                            2
                        ) AS average_working_hours,

                        ROUND(
                            SUM(a.overtime_hours),
                            2
                        ) AS total_overtime_hours

                    FROM attendance_logs a

                    WHERE a.attendance_date = (
                        SELECT MAX(attendance_date)
                        FROM attendance_logs
                    )

                    GROUP BY a.attendance_date
                """)
            )

            report = result.mappings().first()

            if report is None:
                print("ℹ️ No attendance data available for daily report.")
                return

            print("✅ Daily report generated")
            print(f"   Date: {report['attendance_date']}")
            print(f"   Total records: {report['total_records']}")
            print(f"   Present: {report['present_count']}")
            print(f"   Absent: {report['absent_count']}")
            print(f"   Late: {report['late_count']}")
            print(
                f"   Average working hours: "
                f"{report['average_working_hours']}"
            )
            print(
                f"   Total overtime hours: "
                f"{report['total_overtime_hours']}"
            )

    except Exception as error:
        print(f"❌ Daily report failed: {error}")


def generate_monthly_report_job():
    print(f"🟢 Monthly report job started at {datetime.now()}")

    from backend.database import engine

    try:
        with engine.connect() as connection:
            result = connection.execute(
                text("""
                    SELECT
                        DATE_FORMAT(
                            attendance_date,
                            '%Y-%m'
                        ) AS report_month,

                        COUNT(*) AS total_records,

                        SUM(
                            CASE
                                WHEN status = 'Present' THEN 1
                                ELSE 0
                            END
                        ) AS present_count,

                        SUM(
                            CASE
                                WHEN status = 'Absent' THEN 1
                                ELSE 0
                            END
                        ) AS absent_count,

                        SUM(
                            CASE
                                WHEN status = 'Late' THEN 1
                                ELSE 0
                            END
                        ) AS late_count,

                        ROUND(
                            AVG(working_hours),
                            2
                        ) AS average_working_hours,

                        ROUND(
                            SUM(overtime_hours),
                            2
                        ) AS total_overtime_hours

                    FROM attendance_logs

                    WHERE attendance_date >= (
                        SELECT DATE_FORMAT(
                            MAX(attendance_date),
                            '%Y-%m-01'
                        )
                        FROM attendance_logs
                    )

                    GROUP BY
                        DATE_FORMAT(
                            attendance_date,
                            '%Y-%m'
                        )
                """)
            )

            report = result.mappings().first()

            if report is None:
                print(
                    "ℹ️ No attendance data available "
                    "for monthly report."
                )
                return

            print("✅ Monthly report generated")
            print(f"   Month: {report['report_month']}")
            print(f"   Total records: {report['total_records']}")
            print(f"   Present: {report['present_count']}")
            print(f"   Absent: {report['absent_count']}")
            print(f"   Late: {report['late_count']}")
            print(
                f"   Average working hours: "
                f"{report['average_working_hours']}"
            )
            print(
                f"   Total overtime hours: "
                f"{report['total_overtime_hours']}"
            )

    except Exception as error:
        print(f"❌ Monthly report failed: {error}")


def generate_ai_insights_job():
    print(f"🟢 AI insights job started at {datetime.now()}")

    try:
        # Import here to avoid a circular import:
        # main.py already imports the scheduler.
        from backend.main import _generate_and_store_ai_insights

        result = _generate_and_store_ai_insights()

        print("✅ AI insights generated successfully")
        print(f"   Generated at: {result['generated_at']}")
        print(f"   Model: {result['model']}")

        insights = result.get("insights", {})

        print(
            f"   Health: "
            f"{insights.get('attendance_health', {}).get('status')}"
        )

        print(
            f"   Risk departments: "
            f"{len(insights.get('risk_departments', []))}"
        )

        print(
            f"   Recommendations: "
            f"{len(insights.get('recommendations', []))}"
        )

    except Exception as error:
        print(f"❌ AI insights generation failed: {error}")


def database_backup_job():
    print(f"🟢 Database backup job started at {datetime.now()}")

    import subprocess
    from pathlib import Path

    backup_folder = Path("data/backups")
    backup_folder.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

    backup_file = (
        backup_folder /
        f"attendance_analytics_{timestamp}.sql"
    )

    try:

        command = [
            "mysqldump",
            "-u", os.getenv("DB_USER"),
            f"-p{os.getenv('DB_PASSWORD')}",
            os.getenv("DB_NAME")
        ]

        with open(backup_file, "w", encoding="utf-8") as file:

            subprocess.run(
                command,
                stdout=file,
                stderr=subprocess.PIPE,
                text=True,
                check=True
            )

        print("✅ Database backup completed")
        print(f"   Backup file: {backup_file}")

    except subprocess.CalledProcessError as error:

        print("❌ Database backup failed")
        print(error.stderr)

    except Exception as error:

        print(f"❌ Database backup failed: {error}")

        with open(backup_file, "w", encoding="utf-8") as file:

            subprocess.run(
                command,
                stdout=file,
                stderr=subprocess.PIPE,
                text=True,
                check=True
            )

        print("✅ Database backup completed")
        print(f"   Backup file: {backup_file}")

    except subprocess.CalledProcessError as error:

        print("❌ Database backup failed")
        print(error.stderr)

    except Exception as error:

        print(f"❌ Database backup failed: {error}")


def data_archival_job():
    print(f"🟢 Data archival job started at {datetime.now()}")

    from backend.database import engine
    from sqlalchemy import text

    try:
        with engine.begin() as connection:

            # -------------------------------------------------
            # CREATE ARCHIVE TABLE IF IT DOES NOT EXIST
            # -------------------------------------------------

            connection.execute(
                text("""
                    CREATE TABLE IF NOT EXISTS attendance_logs_archive
                    LIKE attendance_logs
                """)
            )

            # -------------------------------------------------
            # FIND RECORDS OLDER THAN 1 YEAR
            # -------------------------------------------------

            result = connection.execute(
                text("""
                    SELECT COUNT(*)
                    FROM attendance_logs
                    WHERE attendance_date < DATE_SUB(
                        CURDATE(),
                        INTERVAL 1 YEAR
                    )
                """)
            )

            old_records = result.scalar()

            if old_records == 0:
                print("ℹ️ No records older than 1 year found.")
                return

            # -------------------------------------------------
            # COPY OLD RECORDS TO ARCHIVE
            # -------------------------------------------------

            connection.execute(
                text("""
                    INSERT INTO attendance_logs_archive
                    SELECT *
                    FROM attendance_logs
                    WHERE attendance_date < DATE_SUB(
                        CURDATE(),
                        INTERVAL 1 YEAR
                    )
                """)
            )

            # -------------------------------------------------
            # DELETE ONLY THE ARCHIVED RECORDS
            # -------------------------------------------------

            connection.execute(
                text("""
                    DELETE FROM attendance_logs
                    WHERE attendance_date < DATE_SUB(
                        CURDATE(),
                        INTERVAL 1 YEAR
                    )
                """)
            )

            print("✅ Data archival completed")
            print(f"   Records archived: {old_records}")

    except Exception as error:
        print(f"❌ Data archival failed: {error}")


def cleanup_temp_files_job():
    print(f"🟢 Temporary file cleanup job started at {datetime.now()}")

    from pathlib import Path

    temp_folder = Path("data/temp")

    try:
        if not temp_folder.exists():
            print("ℹ️ No temporary folder found.")
            return

        deleted_files = 0

        for file_path in temp_folder.iterdir():

            if file_path.is_file():

                try:
                    file_path.unlink()
                    deleted_files += 1

                except Exception as error:
                    print(
                        f"⚠️ Could not delete "
                        f"{file_path.name}: {error}"
                    )

        print("✅ Temporary-file cleanup completed")
        print(f"   Files deleted: {deleted_files}")

    except Exception as error:
        print(f"❌ Temporary-file cleanup failed: {error}")


def start_scheduler():
    scheduler.add_job(
        daily_etl_job,
        "cron",
        hour=2,
        minute=0,
        id="daily_etl",
        replace_existing=True,
    )

    scheduler.add_job(
        weekly_rollup_job,
        "cron",
        day_of_week="mon",
        hour=3,
        minute=0,
        id="weekly_rollup",
        replace_existing=True,
    )

    scheduler.add_job(
    update_dashboard_metrics_job,
    "interval",
    minutes=5,
    id="dashboard_metrics",
    replace_existing=True,
)

    scheduler.add_job(
        generate_daily_report_job,
        "cron",
        hour=6,
        minute=0,
        id="daily_reports",
        replace_existing=True,
    )

    scheduler.add_job(
        generate_monthly_report_job,
        "cron",
        day=1,
        hour=6,
        minute=0,
        id="monthly_reports",
        replace_existing=True,
    )

    scheduler.add_job(
        generate_ai_insights_job,
        "cron",
        hour=4,
        minute=0,
        id="ai_insights",
        replace_existing=True,
    )

    scheduler.add_job(
        database_backup_job,
        "cron",
        hour=1,
        minute=0,
        id="database_backup",
        replace_existing=True,
    )

    scheduler.add_job(
        data_archival_job,
        "cron",
        day=1,
        hour=0,
        minute=0,
        id="data_archival",
        replace_existing=True,
    )

    scheduler.add_job(
        cleanup_temp_files_job,
        "cron",
        hour=5,
        minute=0,
        id="cleanup_temp_files",
        replace_existing=True,
    )

    scheduler.start()

    print("✅ Scheduler started")

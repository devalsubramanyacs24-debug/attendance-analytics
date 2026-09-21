from backend import scheduler


def test_scheduler_registers_required_jobs(monkeypatch):
    registered_jobs = []

    class FakeScheduler:
        def add_job(self, func, trigger, **kwargs):
            registered_jobs.append({
                "function": func.__name__,
                "trigger": trigger,
                "id": kwargs.get("id"),
            })

        def start(self):
            pass

    fake_scheduler = FakeScheduler()

    monkeypatch.setattr(
        scheduler,
        "scheduler",
        fake_scheduler
    )

    scheduler.start_scheduler()

    job_ids = {
        job["id"]
        for job in registered_jobs
    }

    expected_jobs = {
        "daily_etl",
        "weekly_rollup",
        "dashboard_metrics",
        "daily_reports",
        "monthly_reports",
        "ai_insights",
        "database_backup",
        "data_archival",
        "cleanup_temp_files",
    }

    assert job_ids == expected_jobs
    assert len(registered_jobs) == 9

    daily_report = next(
        job for job in registered_jobs
        if job["id"] == "daily_reports"
    )

    monthly_report = next(
        job for job in registered_jobs
        if job["id"] == "monthly_reports"
    )

    assert daily_report["function"] == "generate_daily_report_job"
    assert monthly_report["function"] == "generate_monthly_report_job"
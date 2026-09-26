from sentinel_x.database import Base, SessionLocal, engine
from sentinel_x.service import load_scenario, reset_demo


def main():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        reset_demo(db)
        result = load_scenario(db, "multi_stage")
        print(f"Seeded SENTINEL-X demo: {result}")


if __name__ == "__main__":
    main()

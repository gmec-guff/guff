from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, String

BASE = declarative_base()

class BrandVO(BASE):
    __tablename__ = 'Brand'
    brand_id = Column(String, primary_key=True)
    brand_name = Column(String)

    def __init__(self, brand_name):
        self.brand_name = brand_name

    def __repr__(self):
        return f"BrandVO(brand_name={self.brand_name})"

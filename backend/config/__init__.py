import pymysql
pymysql.install_as_MySQLdb()

try:
    from config.celery import app as celery_app
    __all__ = ('celery_app',)
except ImportError:
    pass

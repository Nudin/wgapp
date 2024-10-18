import uuid

from fastapi import Depends
from fastapi_users import BaseUserManager, FastAPIUsers
from fastapi_users.authentication import AuthenticationBackend, CookieTransport
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase

from database import get_db
from models import User


class UserManager(BaseUserManager[User, uuid.UUID]):
    user_db_model = User
    reset_password_token_secret = "SECRET"
    verification_token_secret = "SECRET"


async def get_user_db(session=Depends(get_db)):
    yield SQLAlchemyUserDatabase(session, User)


cookie_transport = CookieTransport(cookie_name="auth", cookie_max_age=3600)

auth_backend = AuthenticationBackend(
    name="cookie", transport=cookie_transport, get_strategy=UserManager
)


fastapi_users = FastAPIUsers[User, uuid.UUID](
    get_user_manager=UserManager,
    auth_backends=[auth_backend],
)

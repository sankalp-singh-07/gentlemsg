import logging

logger = logging.getLogger(__name__)

async def send_welcome_email(email: str, name: str):
    """
    Simulated sending of a welcome email.
    In a real application, connect this to SendGrid, AWS SES, or an SMTP server.
    """
    logger.info(f"[EMAIL SIMULATION] Sending WELCOME email to: {email}")
    content = f"Hello {name},\n\nWelcome to GentleMSG! Start connecting with friends safely and securely."
    logger.debug(f"Email Content:\n{content}")
    return True

async def send_friend_request_email(email: str, friend_name: str):
    """
    Simulated sending of a friend request notification email.
    """
    logger.info(f"[EMAIL SIMULATION] Sending FRIEND REQUEST email to: {email}")
    content = f"Hello,\n\n{friend_name} has sent you a friend request on GentleMSG! Login to accept or decline."
    logger.debug(f"Email Content:\n{content}")
    return True

async def send_security_alert_email(email: str, alert_details: str):
    """
    Simulated sending of a security alert email.
    """
    logger.info(f"[EMAIL SIMULATION] Sending SECURITY ALERT email to: {email}")
    content = f"Hello,\n\nWe noticed a new security event on your account:\n{alert_details}\n\nIf this was not you, please contact support immediately."
    logger.debug(f"Email Content:\n{content}")
    return True

async def send_account_deletion_email(email: str):
    """
    Simulated sending of an account termination confirmation email.
    """
    logger.info(f"[EMAIL SIMULATION] Sending ACCOUNT DELETION email to: {email}")
    content = f"Hello,\n\nYour GentleMSG account and all associated data have been permanently deleted as requested.\n\nWe're sorry to see you go!"
    logger.debug(f"Email Content:\n{content}")
    return True

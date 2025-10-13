# GRC/auditing/utils.py
from .models import Log

def create_log(user, action, module, level='info', details=''):
    """
    A helper function to easily create log entries.
    """
    Log.objects.create(
        user=user,
        action=action,
        module=module,
        level=level,
        details=details
    )

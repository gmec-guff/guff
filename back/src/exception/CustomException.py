class HwpOpenError(Exception):
    def __init__(self, message="Can't open HWP file."):
        self.message = message
        super().__init__(self.message)


class HwpObjectNotFoundError(Exception):
    def __init__(self, message="Can't find HWP"):
        self.message = message
        super().__init__(self.message)


class NotFoundKeyWordError(Exception):
    def __init__(self, message="Can't find the keyword"):
        self.message = message
        super().__init__(self.message)


class NoneException(Exception):
    def __init__(self, message="Data is not found"):
        self.message = message
        super().__init__(self.message)

class ParseException(Exception):
    def __init__(self, message="Error raise on parsing"):
        self.message = message
        super().__init__(self.message)

class CreateException(Exception):
    def __init__(self, message='Insert Error on DB'):
        self.message = message
        super().__init__(self.message)


class ReadException(Exception):
    def __init__(self, message='Read Error on DB'):
        self.message = message
        super().__init__(self.message)


class UpdateException(Exception):
    def __init__(self, message='Update Error on DB'):
        self.message = message
        super().__init__(self.message)


class DeleteException(Exception):
    def __init__(self, message='Delete Error on DB'):
        self.message = message
        super().__init__(self.message)

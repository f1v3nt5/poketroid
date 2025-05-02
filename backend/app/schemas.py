from marshmallow import Schema, fields, validate, validates_schema


class ProfileUpdateSchema(Schema):
    display_name = fields.Str(validate=validate.Length(min=1, max=50))
    gender = fields.Str(validate=validate.OneOf(['male', 'female', '']))
    age = fields.Int(validate=validate.Range(min=5, max=120, error="Age must be between 5 and 120"))
    about = fields.Str(validate=validate.Length(max=500))
    avatar_filename = fields.Str(validate=validate.Length(max=256))

    @validates_schema
    def validate_empty_strings(self, data, **kwargs):
        if 'gender' in data and data['gender'] == '':
            data['gender'] = None
        if 'age' in data and data['age'] == '':
            data['age'] = None

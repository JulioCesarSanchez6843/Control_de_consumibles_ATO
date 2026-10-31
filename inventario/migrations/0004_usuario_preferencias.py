from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0003_usuario_foto'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuario',
            name='preferencias',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]